import React, { useState, useEffect } from 'react';
import { X, Check, ChevronLeft, ChevronRight, RefreshCw, AlertTriangle, MapPin, Edit2, ShieldAlert } from 'lucide-react';
import { providersApi } from '../../lib/api';
import MapPicker from '../../components/common/MapPicker';

const initials = (name = '') =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

const AVATAR_PALETTE = [
  'from-violet-500 to-indigo-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-red-500',
  'from-pink-500 to-rose-600',
];

const avatarGrad = (name = '') =>
  AVATAR_PALETTE[name.charCodeAt(0) % AVATAR_PALETTE.length];

const Field = ({ label, required, error, checkingMsg, children, id }) => (
  <div className="space-y-1.5" id={`field-container-${id}`}>
    <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
    {checkingMsg && !error && (
      <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">{checkingMsg}</span>
    )}
    {error && (
      <span className="text-[10px] text-red-550 font-bold block mt-0.5">{error}</span>
    )}
  </div>
);

const Input = ({ error, success, ...props }) => (
  <input
    {...props}
    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 transition ${
      error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/25' : 
      success ? 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/25 text-emerald-850 bg-emerald-50/20' : 
      'border-slate-200 focus:border-blue-400 focus:ring-blue-500/25'
    }`}
  />
);

export const ProviderWizardModal = ({ 
  isOpen, 
  step, 
  setStep, 
  totalSteps = 4, 
  form, 
  setForm, 
  branches, 
  saving, 
  onClose, 
  onNext, 
  onPrev, 
  onSave, 
  onSaveDraft, 
  setCurrentStep 
}) => {
  if (!isOpen) return null;
  const [errors, setErrors] = useState({});
  const [checking, setChecking] = useState({});
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [branchSearchQuery, setBranchSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const [draftToast, setDraftToast] = useState(null);
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [manualSaveStatus, setManualSaveStatus] = useState('idle');

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      setChecking({});
      setManualSaveStatus('idle');
      setDraftToast(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (draftToast && draftToast.type === 'success') {
      const timer = setTimeout(() => {
        setDraftToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [draftToast]);

  const handleSaveDraftClick = async () => {
    // Save Draft NEVER validates — just persist current progress immediately
    setManualSaveStatus('saving');
    setIsDraftSaving(true);
    setDraftToast(null);
    try {
      await onSaveDraft(form, step);
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      const formattedTime = `Today • ${timeStr}`;

      setDraftToast({
        message: `✓ ${form.providerType} draft saved successfully.`,
        time: formattedTime,
        type: 'success'
      });
      setManualSaveStatus('saved');
      setTimeout(() => {
        setManualSaveStatus('idle');
      }, 3000);
    } catch (err) {
      setDraftToast({
        message: 'Unable to save draft. Please try again. Your entered information has been preserved.',
        type: 'error'
      });
      setManualSaveStatus('failed');
    } finally {
      setIsDraftSaving(false);
    }
  };

  // Utility to format branch address city and state
  const formatBranchAddress = (b) => {
    if (!b) return '';
    if (b.city && b.state) {
      return `${b.city}, ${b.state}`;
    }
    const parts = b.address ? b.address.split(',') : [];
    if (parts.length >= 2) {
      const stateZip = parts[parts.length - 1].trim();
      const city = parts[parts.length - 2].trim();
      return `${city}, ${stateZip}`;
    }
    return b.address || '';
  };


  const F = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
    if (errors[key]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
    if (checking[key]) {
      setChecking(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const FA = (key, val) => {
    setForm(prev => ({ ...prev, address: { ...prev.address, [key]: val } }));
    const errorKey = `address.${key}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[errorKey];
        return next;
      });
    }
  };

  const FW = (obj) => setForm(prev => ({ ...prev, workingHours: { ...prev.workingHours, ...obj } }));

  const stepLabels = ['Basic Info', 'Manager', 'Operational Setup', 'Review'];
  const autoId = form.globalId || `${form.providerType === 'Laboratory' ? 'LAB' : 'PHR'}-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`;

  const validateStepFields = async (currentStep, isSubmit = false) => {
    const nextErrors = {};

    if (currentStep === 1) {
      if (!form.name?.trim()) {
        nextErrors.name = `${form.providerType === 'Laboratory' ? 'Laboratory' : 'Pharmacy'} Name is required.`;
      }
      const subtype = form.providerSubtype || 'Internal';
      if (!subtype) {
        nextErrors.providerSubtype = 'Please select ownership.';
      }
      if (!form.assignedBranches || form.assignedBranches.length === 0 || !form.assignedBranches[0]) {
        nextErrors.assignedBranches = form.providerType === 'Laboratory'
          ? 'Please select the branch where this laboratory will primarily operate.'
          : 'Please select the branch where this pharmacy will primarily operate.';
      }
      
      // Email
      if (!form.email?.trim()) {
        nextErrors.email = 'Email address is required.';
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(form.email)) {
          nextErrors.email = 'Please enter a valid email address.';
        }
      }

      // Phone
      if (!form.phone?.trim()) {
        nextErrors.phone = 'Phone number is required.';
      } else {
        const phoneDigits = form.phone.replace(/\D/g, '');
        if (phoneDigits.length < 10) {
          nextErrors.phone = 'Please enter a valid phone number.';
        }
      }

      // Address
      if (!form.address?.line1?.trim()) {
        nextErrors['address.line1'] = 'Address Line 1 is required.';
      }
      if (!form.address?.city?.trim()) {
        nextErrors['address.city'] = 'City is required.';
      }
      if (!form.address?.state?.trim()) {
        nextErrors['address.state'] = 'State is required.';
      }
      if (!form.address?.pincode?.trim()) {
        nextErrors['address.pincode'] = 'Postal Code is required.';
      }
    }

    if (currentStep === 2) {
      if (!form.contactPerson?.trim()) {
        nextErrors.contactPerson = 'Manager name is required.';
      }
      if (!form.managerGender) {
        nextErrors.managerGender = 'Manager gender is required.';
      }

      // Manager Email
      if (!form.managerEmail?.trim()) {
        nextErrors.managerEmail = 'Please enter a valid email address.';
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(form.managerEmail)) {
          nextErrors.managerEmail = 'Please enter a valid email address.';
        }
      }

      // Manager Phone
      if (!form.managerPhone?.trim()) {
        nextErrors.managerPhone = 'Please enter a valid phone number.';
      } else {
        const phoneDigits = form.managerPhone.replace(/\D/g, '');
        if (phoneDigits.length < 10) {
          nextErrors.managerPhone = 'Please enter a valid phone number.';
        }
      }
    }

    // Call backend validate-provider-data to verify uniqueness and other backend constraints
    if (Object.keys(nextErrors).length === 0 && currentStep === 3 && isSubmit) {
      try {
        await providersApi.validateProviderData({
          ...form,
          _id: form._id
        });
      } catch (err) {
        if (err.response?.data?.errors) {
          Object.assign(nextErrors, err.response.data.errors);
        } else {
          nextErrors.apiError = err.response?.data?.message || 'Validation failed.';
        }
      }
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setTimeout(() => {
        const firstErrorKey = Object.keys(nextErrors)[0];
        const element = document.getElementById(`field-container-${firstErrorKey}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
      return false;
    }

    return true;
  };

  const handleNextClick = async () => {
    const isValid = await validateStepFields(step);
    if (isValid) {
      const nextStep = Math.min(step + 1, totalSteps);
      if (onSaveDraft) {
        onSaveDraft(form, nextStep);
      }
      if (onNext) {
        onNext();
      } else if (setStep) {
        setStep(nextStep);
      }
    }
  };

  const handlePrevClick = () => {
    const prevStep = Math.max(step - 1, 1);
    if (onSaveDraft) {
      onSaveDraft(form, prevStep);
    }
    if (onPrev) {
      onPrev();
    } else if (setStep) {
      setStep(prevStep);
    }
  };

  const handleSaveClick = async () => {
    let allValid = true;
    for (let s = 1; s <= 2; s++) {
      const isValid = await validateStepFields(s, false);
      if (!isValid) {
        allValid = false;
        if (setStep) {
          setStep(s);
        }
        return;
      }
    }

    const nextErrors = {};
    try {
      await providersApi.validateProviderData({
        ...form,
        _id: form._id
      });
    } catch (err) {
      if (err.response?.data?.errors) {
        Object.assign(nextErrors, err.response.data.errors);
      } else {
        nextErrors.apiError = err.response?.data?.message || 'Validation failed.';
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const errorKeys = Object.keys(nextErrors);
      const step1Fields = ['name', 'email', 'phone', 'address', 'assignedBranches', 'providerSubtype', 'address.line1', 'address.city', 'address.state', 'address.pincode'];
      const step2Fields = ['contactPerson', 'managerEmail', 'managerPhone', 'managerGender'];
      
      let errorStep = 4;
      if (errorKeys.some(k => step1Fields.includes(k))) {
        errorStep = 1;
      } else if (errorKeys.some(k => step2Fields.includes(k))) {
        errorStep = 2;
      } else {
        errorStep = 3;
      }

      if (setStep) {
        setStep(errorStep);
      }
      return;
    }

    try {
      await onSave();
    } catch (err) {
      setErrors(prev => ({
        ...prev,
        apiError: err.response?.data?.message || err.message || 'Failed to save provider.'
      }));
    }
  };

  const handleBlur = async (field, value) => {
    if (!value?.trim()) return;

    if (field === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        setErrors(prev => ({ ...prev, email: 'Please enter a valid email address.' }));
        return;
      }
      setChecking(prev => ({ ...prev, email: 'Checking availability...' }));
      try {
        const res = await providersApi.validateEmail({ email: value, providerId: form._id });
        if (res.data?.isValid) {
          setChecking(prev => ({ ...prev, email: '✓ Email available' }));
          setErrors(prev => { const n = { ...prev }; delete n.email; return n; });
        } else {
          setErrors(prev => ({ ...prev, email: res.data?.message || 'This email address is already registered.' }));
          setChecking(prev => { const n = { ...prev }; delete n.email; return n; });
        }
      } catch (err) {
        setErrors(prev => ({ ...prev, email: err.response?.data?.message || 'Failed to validate email.' }));
        setChecking(prev => { const n = { ...prev }; delete n.email; return n; });
      }
    }

    if (field === 'phone') {
      const phoneDigits = value.replace(/\D/g, '');
      if (phoneDigits.length < 10) {
        setErrors(prev => ({ ...prev, phone: 'Please enter a valid phone number.' }));
        return;
      }
      setChecking(prev => ({ ...prev, phone: 'Checking availability...' }));
      try {
        const res = await providersApi.validatePhone({ phone: value, providerId: form._id });
        if (res.data?.isValid) {
          setChecking(prev => ({ ...prev, phone: '✓ Phone number available' }));
          setErrors(prev => { const n = { ...prev }; delete n.phone; return n; });
        } else {
          setErrors(prev => ({ ...prev, phone: res.data?.message || 'This phone number is already registered.' }));
          setChecking(prev => { const n = { ...prev }; delete n.phone; return n; });
        }
      } catch (err) {
        setErrors(prev => ({ ...prev, phone: err.response?.data?.message || 'Failed to validate phone.' }));
        setChecking(prev => { const n = { ...prev }; delete n.phone; return n; });
      }
    }

    if (field === 'managerEmail') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        setErrors(prev => ({ ...prev, managerEmail: 'Please enter a valid email address.' }));
        return;
      }
      setChecking(prev => ({ ...prev, managerEmail: 'Checking availability...' }));
      try {
        const res = await providersApi.validateManagerEmail({ email: value, providerId: form._id });
        if (res.data?.isValid) {
          setChecking(prev => ({ ...prev, managerEmail: '✓ Email available' }));
          setErrors(prev => { const n = { ...prev }; delete n.managerEmail; return n; });
        } else {
          setErrors(prev => ({ ...prev, managerEmail: res.data?.message || 'This email address is already registered.' }));
          setChecking(prev => { const n = { ...prev }; delete n.managerEmail; return n; });
        }
      } catch (err) {
        setErrors(prev => ({ ...prev, managerEmail: err.response?.data?.message || 'Failed to validate manager email.' }));
        setChecking(prev => { const n = { ...prev }; delete n.managerEmail; return n; });
      }
    }

    if (field === 'managerPhone') {
      const phoneDigits = value.replace(/\D/g, '');
      if (phoneDigits.length < 10) {
        setErrors(prev => ({ ...prev, managerPhone: 'Please enter a valid phone number.' }));
        return;
      }
      setChecking(prev => ({ ...prev, managerPhone: 'Checking availability...' }));
      try {
        const res = await providersApi.validateManagerPhone({ phone: value, providerId: form._id });
        if (res.data?.isValid) {
          setChecking(prev => ({ ...prev, managerPhone: '✓ Phone number available' }));
          setErrors(prev => { const n = { ...prev }; delete n.managerPhone; return n; });
        } else {
          setErrors(prev => ({ ...prev, managerPhone: res.data?.message || 'This phone number is already registered.' }));
          setChecking(prev => { const n = { ...prev }; delete n.managerPhone; return n; });
        }
      } catch (err) {
        setErrors(prev => ({ ...prev, managerPhone: err.response?.data?.message || 'Failed to validate manager phone.' }));
        setChecking(prev => { const n = { ...prev }; delete n.managerPhone; return n; });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-lg font-black text-slate-900">Add New {form.providerType === 'Laboratory' ? 'Laboratory' : 'Pharmacy'} Provider</h3>
            <p className="text-xs text-slate-400 mt-0.5">Step {step} of {totalSteps} — {stepLabels[step - 1]}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress */}
        <div className="flex bg-slate-50 flex-shrink-0">
          {stepLabels.map((label, i) => (
            <div key={i} className={`flex-1 py-3 text-center text-[10px] font-black uppercase tracking-wider transition ${i + 1 === step ? 'bg-blue-600 text-white' :
                i + 1 < step ? 'bg-blue-100 text-blue-600' : 'text-slate-400'
              }`}>
              {i + 1 < step ? <Check className="w-3 h-3 mx-auto" /> : label}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {draftToast && (
            <div className={`p-4 rounded-xl text-xs font-black flex items-center justify-between border animate-fadeIn ${
              draftToast.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center gap-2">
                {draftToast.type === 'success' ? <Check className="w-4 h-4 text-green-600" /> : <ShieldAlert className="w-4 h-4 text-red-600" />}
                <div className="space-y-0.5">
                  <p>{draftToast.message}</p>
                  {draftToast.time && (
                    <p className="text-[10px] font-bold text-slate-400">Last saved: {draftToast.time}</p>
                  )}
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setDraftToast(null)} 
                className={`p-1 rounded-lg transition ${
                  draftToast.type === 'success' ? 'hover:bg-green-150' : 'hover:bg-red-150'
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* STEP 1: Basic Information */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label={`${form.providerType === 'Laboratory' ? 'Laboratory' : 'Pharmacy'} Name`} required error={errors.name} id="name">
                  <Input error={errors.name} placeholder={form.providerType === 'Laboratory' ? "e.g. Radha Krishna Laboratory" : "e.g. Ram Krishna Pharmacy"} value={form.name} onChange={e => F('name', e.target.value)} />
                </Field>
                <Field label="Provider ID (Auto-generated)">
                  <Input disabled value={form.globalId || autoId} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Ownership" required error={errors.providerSubtype} id="providerSubtype">
                  <select value={form.providerSubtype} onChange={e => F('providerSubtype', e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl focus:outline-none text-slate-700 font-semibold ${
                      errors.providerSubtype ? 'border-red-500' : 'border-slate-200'
                    }`}>
                    <option value="Internal">Internal</option>
                    <option value="External">External</option>
                  </select>
                </Field>
                <Field label="Assigned Branch" required error={errors.assignedBranches} id="assignedBranches">
                  {(!branches || branches.length === 0) ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4.5 text-center space-y-3 shadow-sm animate-scaleIn">
                      <div className="flex items-center justify-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-black text-slate-800">No branches found.</span>
                      </div>
                      <p className="text-[10px] text-slate-450 font-bold leading-normal">
                        Please complete the <strong>Branch Setup</strong> step before configuring the {form.providerType === 'Laboratory' ? 'laboratory' : 'pharmacy'}.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          if (setCurrentStep) setCurrentStep(4);
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black cursor-pointer transition shadow-sm"
                      >
                        Go to Branch Setup
                      </button>
                    </div>
                  ) : (
                    <div 
                      className="relative"
                      onKeyDown={(e) => {
                        const filtered = branches.filter(b => {
                          const q = branchSearchQuery.toLowerCase();
                          return (
                            (b.name || '').toLowerCase().includes(q) ||
                            (b.address || '').toLowerCase().includes(q) ||
                            (b.addressLine2 || '').toLowerCase().includes(q) ||
                            (b.city || '').toLowerCase().includes(q) ||
                            (b.state || '').toLowerCase().includes(q) ||
                            (b.pincode || '').toLowerCase().includes(q) ||
                            (b.contact || '').toLowerCase().includes(q)
                          );
                        });

                        if (!branchDropdownOpen) {
                          if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setBranchDropdownOpen(true);
                            setHighlightedIndex(0);
                          }
                          return;
                        }

                        if (e.key === 'Escape') {
                          e.preventDefault();
                          setBranchDropdownOpen(false);
                        } else if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setHighlightedIndex(prev => (prev + 1) % Math.max(1, filtered.length));
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setHighlightedIndex(prev => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
                        } else if (e.key === 'Enter') {
                          e.preventDefault();
                          if (filtered[highlightedIndex]) {
                            const bId = filtered[highlightedIndex]._id || filtered[highlightedIndex].id;
                            F('assignedBranches', [bId]);
                            setBranchDropdownOpen(false);
                          }
                        }
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setBranchDropdownOpen(!branchDropdownOpen);
                          setBranchSearchQuery('');
                          setHighlightedIndex(0);
                        }}
                        className={`w-full px-5 py-4 text-left bg-white border rounded-xl focus:outline-none flex justify-between items-center transition-all duration-200 hover:border-slate-300 ${
                          errors.assignedBranches ? 'border-red-500 ring-2 ring-red-100' : 'border-slate-200'
                        }`}
                        aria-haspopup="listbox"
                        aria-expanded={branchDropdownOpen}
                      >
                        {(() => {
                          const selectedId = form.assignedBranches?.[0];
                          const selected = branches.find(b => (b._id || b.id) === selectedId);
                          if (selected) {
                            return (
                              <div className="flex justify-between items-center w-full pr-4 gap-4">
                                <div className="flex flex-col gap-1 text-left">
                                  <span className="text-slate-850 text-xs font-black">{selected.name}</span>
                                  <span className="text-[10px] text-slate-500 font-bold leading-normal">
                                    {selected.address}
                                    {selected.addressLine2 ? `, ${selected.addressLine2}` : ''}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-bold">
                                    {selected.city}, {selected.state} – {selected.pincode}
                                  </span>
                                </div>
                                <span className={`px-2.5 py-0.5 text-[8px] font-black rounded-full uppercase border shrink-0 tracking-wider ${
                                  selected.isPrimary 
                                    ? 'bg-green-50 text-green-700 border-green-200' 
                                    : 'bg-blue-50 text-blue-755 border-blue-200'
                                }`}>
                                  {selected.isPrimary ? 'MAIN BRANCH' : 'SECONDARY BRANCH'}
                                </span>
                              </div>
                            );
                          }
                          return <span className="text-slate-400 font-bold">Select Branch</span>;
                        })()}
                        <span className="text-slate-400 text-[10px] shrink-0 transition-transform duration-200" style={{ transform: branchDropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                      </button>

                      {branchDropdownOpen && (
                        <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-150 rounded-[18px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] z-50 max-h-[360px] overflow-hidden flex flex-col">
                          <div className="p-3 bg-white border-b border-slate-100 sticky top-0 z-10">
                            <input
                              type="text"
                              value={branchSearchQuery}
                              onChange={(e) => {
                                  setBranchSearchQuery(e.target.value);
                                  setHighlightedIndex(0);
                              }}
                              placeholder="Search branch by branch name, address or phone..."
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-green-600 focus:bg-white transition"
                              autoFocus
                            />
                          </div>
                          
                          <div className="p-2 overflow-y-auto max-h-[280px] space-y-1.5 scrollbar-thin">
                            {(() => {
                              const filtered = branches.filter(b => {
                                const q = branchSearchQuery.toLowerCase();
                                return (
                                  (b.name || '').toLowerCase().includes(q) ||
                                  (b.address || '').toLowerCase().includes(q) ||
                                  (b.addressLine2 || '').toLowerCase().includes(q) ||
                                  (b.city || '').toLowerCase().includes(q) ||
                                  (b.state || '').toLowerCase().includes(q) ||
                                  (b.pincode || '').toLowerCase().includes(q) ||
                                  (b.contact || '').toLowerCase().includes(q)
                                );
                              });

                              if (filtered.length === 0) {
                                return (
                                  <div className="text-center py-6 text-slate-400 text-xs font-bold">
                                    No branches match your search
                                  </div>
                                );
                              }

                              return filtered.map((b, idx) => {
                                const bId = b._id || b.id;
                                const isSel = form.assignedBranches?.[0] === bId;
                                const isHighlight = highlightedIndex === idx;
                                const brCode = b.code || `BR-${String(idx + 1).padStart(3, '0')}`;
                                const completeAddress = `${b.address}${b.addressLine2 ? ', ' + b.addressLine2 : ''}, ${b.city}, ${b.state} – ${b.pincode}`;

                                return (
                                  <button
                                    key={bId}
                                    type="button"
                                    onClick={() => {
                                      F('assignedBranches', [bId]);
                                      setBranchDropdownOpen(false);
                                    }}
                                    className={`w-full p-4 text-left border rounded-xl flex justify-between items-start gap-4 transition-all duration-200 cursor-pointer ${
                                      isSel 
                                        ? 'bg-green-50/30 border-green-200 shadow-sm shadow-green-100/50 hover:shadow-md' 
                                        : isHighlight 
                                          ? 'bg-slate-50 border-slate-300' 
                                          : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                                    }`}
                                    role="option"
                                    aria-selected={isSel}
                                  >
                                    <div className="flex-1 space-y-2 text-left">
                                      <div className="flex justify-between items-center w-full">
                                        <span className={`text-[12.5px] font-black ${isSel ? 'text-green-700' : 'text-slate-800'}`}>{b.name}</span>
                                        <span className={`px-2 py-0.5 text-[8px] font-black rounded-full uppercase border shrink-0 tracking-wider ${
                                          b.isPrimary 
                                            ? 'bg-green-50 text-green-700 border-green-200' 
                                            : 'bg-blue-50 text-blue-755 border-blue-200'
                                        }`}>
                                          {b.isPrimary ? 'MAIN BRANCH' : 'SECONDARY BRANCH'}
                                        </span>
                                      </div>
                                      
                                      <div className="text-[10.5px] text-slate-500 font-bold leading-normal">
                                        {completeAddress}
                                      </div>
                                      
                                      <div className="flex items-center gap-2 text-[9.5px] text-slate-400 font-bold">
                                        {b.contact && (
                                          <>
                                            <span>☎ {b.contact}</span>
                                            <span className="text-slate-200">|</span>
                                          </>
                                        )}
                                        <span>{brCode}</span>
                                        <span className="text-slate-200">|</span>
                                        <span className="flex items-center gap-1.5">
                                          <span className={`w-1.5 h-1.5 rounded-full ${b.active !== false ? 'bg-emerald-500 animate-pulse' : 'bg-rose-450'}`}></span>
                                          <span className={b.active !== false ? 'text-emerald-600' : 'text-rose-500'}>
                                            {b.active !== false ? 'Active' : 'Inactive'}
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {isSel && (
                                      <div className="w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0 border border-green-250 self-center">
                                        ✓
                                      </div>
                                    )}
                                  </button>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Phone Number" required error={errors.phone} checkingMsg={checking.phone} id="phone">
                  <Input error={errors.phone} success={checking.phone === '✓ Phone number available'} placeholder="e.g. 9876543210" value={form.phone} onChange={e => F('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} onBlur={e => handleBlur('phone', e.target.value)} />
                </Field>
                <Field label="Email Address" required error={errors.email} checkingMsg={checking.email} id="email">
                  <Input error={errors.email} success={checking.email === '✓ Email available'} type="email" placeholder="e.g. contact@provider.com" value={form.email} onChange={e => F('email', e.target.value)} onBlur={e => handleBlur('email', e.target.value)} />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Field label="Address Line 1" required error={errors['address.line1']} id="address.line1">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input error={errors['address.line1']} placeholder="Street address, suite, unit" value={form.address.line1} onChange={e => FA('line1', e.target.value)} />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowMapPicker(true)}
                        className="px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-blue-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <MapPin className="w-4 h-4" /> Map
                      </button>
                    </div>
                  </Field>
                </div>
                <Field label="City" required error={errors['address.city']} id="address.city">
                  <Input error={errors['address.city']} placeholder="City name" value={form.address.city} onChange={e => FA('city', e.target.value)} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="State / Province" required error={errors['address.state']} id="address.state">
                  <Input error={errors['address.state']} placeholder="State" value={form.address.state} onChange={e => FA('state', e.target.value)} />
                </Field>
                <Field label="Postal / ZIP Code" required error={errors['address.pincode']} id="address.pincode">
                  <Input error={errors['address.pincode']} placeholder="Pincode" value={form.address.pincode} onChange={e => FA('pincode', e.target.value)} />
                </Field>
              </div>
            </div>
          )}

          {/* STEP 2: Manager details */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Manager Full Name" required error={errors.contactPerson} id="contactPerson">
                  <Input error={errors.contactPerson} placeholder="Full Name" value={form.contactPerson} onChange={e => F('contactPerson', e.target.value)} />
                </Field>
                <Field label="Manager Employee ID">
                  <Input placeholder="e.g. EMP-1025" value={form.managerEmployeeId} onChange={e => F('managerEmployeeId', e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Manager Phone" required error={errors.managerPhone} checkingMsg={checking.managerPhone} id="managerPhone">
                  <Input error={errors.managerPhone} success={checking.managerPhone === '✓ Phone number available'} placeholder="Phone Number" value={form.managerPhone} onChange={e => F('managerPhone', e.target.value.replace(/\D/g, '').slice(0, 10))} onBlur={e => handleBlur('managerPhone', e.target.value)} />
                </Field>
                <Field label="Manager Email" required error={errors.managerEmail} checkingMsg={checking.managerEmail} id="managerEmail">
                  <Input error={errors.managerEmail} success={checking.managerEmail === '✓ Email available'} type="email" placeholder="Email Address" value={form.managerEmail} onChange={e => F('managerEmail', e.target.value)} onBlur={e => handleBlur('managerEmail', e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Manager Gender" required error={errors.managerGender} id="managerGender">
                  <select value={form.managerGender || ''} onChange={e => F('managerGender', e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl focus:outline-none text-slate-700 font-bold ${
                      errors.managerGender ? 'border-red-500' : 'border-slate-200'
                    }`}>
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </Field>
                <Field label="Role" required id="managerRole">
                  <Input disabled value={form.providerType === 'Laboratory' ? 'Laboratory Manager' : 'Pharmacy Manager'} />
                </Field>
              </div>
            </div>
          )}

          {/* STEP 3: Operational Setup */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Working Days" required id="workingDays">
                  <select value={form.workingHours?.workingDays?.join(',') || ''} 
                    onChange={e => FW({ workingDays: e.target.value ? e.target.value.split(',') : [] })}
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-700 font-bold">
                    <option value="">Select Working Days</option>
                    <option value="Mon,Tue,Wed,Thu,Fri">Monday - Friday</option>
                    <option value="Mon,Tue,Wed,Thu,Fri,Sat">Monday - Saturday</option>
                    <option value="Mon,Tue,Wed,Thu,Fri,Sat,Sun">Monday - Sunday</option>
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Opening Time">
                    <Input type="time" value={form.workingHours?.openingTime || ''} onChange={e => FW({ openingTime: e.target.value })} />
                  </Field>
                  <Field label="Closing Time">
                    <Input type="time" value={form.workingHours?.closingTime || ''} onChange={e => FW({ closingTime: e.target.value })} />
                  </Field>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="GST Number">
                  <Input placeholder="e.g. 27XXXXX1234Z1Z5" value={form.gstNumber || ''} onChange={e => F('gstNumber', e.target.value)} />
                </Field>
                <Field label={`${form.providerType === 'Laboratory' ? 'Laboratory' : 'Drug'} License Number`}>
                  <Input placeholder="e.g. DL-XX-XXXXXX" value={form.drugLicenseNumber || ''} onChange={e => F('drugLicenseNumber', e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="License Expiry Date">
                  <Input type="date" value={form.licenseExpiry || ''} onChange={e => F('licenseExpiry', e.target.value)} />
                </Field>
                <Field label="Emergency Contact Number">
                  <Input placeholder="e.g. Emergency Phone Number" value={form.emergencyContact || ''} onChange={e => F('emergencyContact', e.target.value.replace(/\D/g, '').slice(0, 10))} />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {form.providerType === 'Laboratory' ? (
                  <Field label="Laboratory Type" required>
                    <select value={form.apiProviderName || ''} onChange={e => F('apiProviderName', e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-700 font-bold">
                      <option value="">Select Laboratory Type</option>
                      <option value="Pathology">Pathology</option>
                      <option value="Diagnostic Centre">Diagnostic Centre</option>
                      <option value="Microbiology">Microbiology</option>
                      <option value="Radiology">Radiology</option>
                      <option value="Multi-speciality Lab">Multi-speciality Lab</option>
                    </select>
                  </Field>
                ) : (
                  <Field label="Invoice Prefix">
                    <Input placeholder="e.g. PHR" value={form.invoicePrefix || ''} onChange={e => F('invoicePrefix', e.target.value)} />
                  </Field>
                )}
                <div className="col-span-2">
                  <Field label="Reorder Threshold (units)">
                    <Input type="number" min={0} placeholder="e.g. 10" value={form.reorderThreshold !== undefined ? form.reorderThreshold : ''} onChange={e => F('reorderThreshold', e.target.value ? Number(e.target.value) : '')} />
                  </Field>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">Inventory Preferences</label>
                <div className="grid grid-cols-2 gap-4">
                  {[['barcodeEnabled', 'Barcode Scanner Enabled'], ['printerEnabled', 'Label Printer Enabled']].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition bg-slate-50/20">
                      <input type="checkbox" checked={form[key]} onChange={e => F(key, e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                      <span className="text-sm font-semibold text-slate-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider block">Notification Preferences</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ['emailNotifications', 'Email Updates'],
                    ['smsNotifications', 'SMS Alerts'],
                    ['whatsappNotifications', 'WhatsApp Alerts']
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition bg-slate-50/20">
                      <input type="checkbox" checked={form[key] !== false} onChange={e => F(key, e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                      <span className="text-xs font-semibold text-slate-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Review */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-5 border border-slate-200 space-y-4">
                
                {/* Basic Info Section */}
                <div>
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-3">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">1. Basic Information</h4>
                    <button type="button" onClick={() => setStep && setStep(1)} className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1">
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Pharmacy Name</span>
                      <span className="font-semibold text-slate-800">{form.name || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Ownership</span>
                      <span className="font-semibold text-slate-800">{form.providerSubtype || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Phone / Email</span>
                      <span className="font-semibold text-slate-800">{form.phone} / {form.email}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Address</span>
                      <span className="font-semibold text-slate-800">
                        {form.address?.line1}, {form.address?.city}, {form.address?.state} – {form.address?.pincode}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Manager Info Section */}
                <div>
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-3">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">2. Manager Details</h4>
                    <button type="button" onClick={() => setStep && setStep(2)} className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1">
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Manager Name</span>
                      <span className="font-semibold text-slate-800">{form.contactPerson || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Employee ID</span>
                      <span className="font-semibold text-slate-800">{form.managerEmployeeId || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Phone / Email</span>
                      <span className="font-semibold text-slate-800">{form.managerPhone} / {form.managerEmail}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Gender & Role</span>
                      <span className="font-semibold text-slate-800">{form.managerGender || '—'} | {form.providerType === 'Laboratory' ? 'Laboratory Manager' : 'Pharmacy Manager'}</span>
                    </div>
                  </div>
                </div>

                {/* Operational setup Section */}
                <div>
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-3">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">3. Operational Setup</h4>
                    <button type="button" onClick={() => setStep && setStep(3)} className="text-blue-600 hover:text-blue-800 text-xs font-bold flex items-center gap-1">
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Working Hours & Days</span>
                      <span className="font-semibold text-slate-800">
                        {form.workingHours?.openingTime} – {form.workingHours?.closingTime} ({form.workingHours?.workingDays?.length === 5 ? 'Mon-Fri' : form.workingHours?.workingDays?.length === 6 ? 'Mon-Sat' : 'Mon-Sun'})
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">GST & License</span>
                      <span className="font-semibold text-slate-800">{form.gstNumber || '—'} / {form.drugLicenseNumber || '—'} (Exp: {form.licenseExpiry || '—'})</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Emergency Contact</span>
                      <span className="font-semibold text-slate-800">{form.emergencyContact || '—'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Threshold & Peripherals</span>
                      <span className="font-semibold text-slate-800">
                        Reorder Threshold: {form.reorderThreshold || 10} | Barcode: {form.barcodeEnabled ? 'Yes' : 'No'} | Printer: {form.printerEnabled ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {errors.apiError && (
                <div className="bg-red-50 border border-red-150 rounded-xl p-3 text-[11px] text-red-700 font-bold flex items-center gap-2 animate-shake">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-red-605" />
                  <span>{errors.apiError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 bg-blue-50 border border-blue-150 rounded-xl p-3 text-[11px] text-blue-700 font-bold">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>By submitting, you authorize the system to create the provider, manager user credentials and send invitations.</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center flex-shrink-0 bg-slate-50/50">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition">
            Cancel
          </button>
          
          <div className="flex gap-3 items-center">
            {step > 1 && (
              <button onClick={handlePrevClick} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
            
            {onSaveDraft && (
              <button 
                type="button"
                onClick={handleSaveDraftClick} 
                disabled={isDraftSaving}
                className={`px-4 py-2.5 border text-sm font-bold rounded-xl transition flex items-center gap-1.5 disabled:opacity-50 ${
                  manualSaveStatus === 'saved' 
                    ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                    : manualSaveStatus === 'failed'
                      ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {manualSaveStatus === 'saving' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {manualSaveStatus === 'saved' && <Check className="w-3.5 h-3.5 text-green-600" />}
                {manualSaveStatus === 'failed' && <ShieldAlert className="w-3.5 h-3.5 text-red-650" />}
                
                {manualSaveStatus === 'idle' && 'Save Draft'}
                {manualSaveStatus === 'saving' && 'Saving...'}
                {manualSaveStatus === 'saved' && '✓ Draft Saved'}
                {manualSaveStatus === 'failed' && '⚠ Save Failed. Retry'}
              </button>
            )}
            
            {step < totalSteps ? (
              <button onClick={handleNextClick} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSaveClick} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm rounded-xl hover:opacity-90 disabled:opacity-50 transition shadow-lg shadow-blue-200">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Submit {form.providerType} Setup
              </button>
            )}
          </div>
        </div>
      </div>
      {showMapPicker && (
        <MapPicker
          isOpen={showMapPicker}
          onClose={() => setShowMapPicker(false)}
          initialAddress={form.address?.line1}
          onSelectAddress={(addressObj) => {
            setForm(prev => ({
              ...prev,
              address: {
                ...prev.address,
                line1: addressObj.line1 || '',
                city: addressObj.city || '',
                state: addressObj.state || '',
                pincode: addressObj.pincode || '',
                country: addressObj.country || 'India',
                latitude: addressObj.latitude,
                longitude: addressObj.longitude
              }
            }));
            // Clear validation errors for address fields
            setErrors(prev => {
              const next = { ...prev };
              delete next['address.line1'];
              delete next['address.city'];
              delete next['address.state'];
              delete next['address.pincode'];
              return next;
            });
            setShowMapPicker(false);
          }}
        />
      )}
    </div>
  );
};
