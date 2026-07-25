import React, { useState } from 'react';
import { X, Check, ChevronLeft, ChevronRight, RefreshCw, AlertTriangle, MapPin } from 'lucide-react';
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

export const ProviderWizardModal = ({ step, totalSteps, form, setForm, branches, saving, onClose, onNext, onPrev, onSave }) => {
  const [errors, setErrors] = useState({});
  const [checking, setChecking] = useState({});
  const [showMapPicker, setShowMapPicker] = useState(false);

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

  const validateStepFields = async (currentStep) => {
    const nextErrors = {};

    if (currentStep === 1) {
      if (!form.name?.trim()) {
        nextErrors.name = `${form.providerType === 'Laboratory' ? 'Laboratory' : 'Pharmacy'} Name is required.`;
      }
      if (!form.providerSubtype) {
        nextErrors.providerSubtype = 'Please select ownership.';
      }
      if (!form.assignedBranches || form.assignedBranches.length === 0 || !form.assignedBranches[0]) {
        nextErrors.assignedBranches = 'Please select a branch.';
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
    if (Object.keys(nextErrors).length === 0 && currentStep === 3) {
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
      // Find first error field container and scroll to it
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
      onNext();
    }
  };

  const handleSaveClick = async () => {
    // Validate everything again
    let allValid = true;
    for (let s = 1; s <= 3; s++) {
      const isValid = await validateStepFields(s);
      if (!isValid) {
        allValid = false;
        // Jump back to the invalid step
        if (step !== s) {
          // Go to step s
          if (s === 1) { onPrev(); onPrev(); onPrev(); }
          else if (s === 2) { onPrev(); onPrev(); }
          else if (s === 3) { onPrev(); }
        }
        break;
      }
    }

    if (allValid) {
      onSave();
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
                  <select value={form.assignedBranches?.[0] || ''} onChange={e => F('assignedBranches', [e.target.value])}
                    className={`w-full px-3.5 py-2.5 text-sm bg-slate-50 border rounded-xl focus:outline-none text-slate-700 font-semibold ${
                      errors.assignedBranches ? 'border-red-500' : 'border-slate-200'
                    }`}>
                    <option value="">Select Branch</option>
                    {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
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
                <Field label="Opening Time">
                  <Input type="time" value={form.workingHours.openingTime} onChange={e => FW({ openingTime: e.target.value })} />
                </Field>
                <Field label="Closing Time">
                  <Input type="time" value={form.workingHours.closingTime} onChange={e => FW({ closingTime: e.target.value })} />
                </Field>
              </div>
            </div>
          )}

          {/* STEP 3: Operational Setup */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="GST Number">
                  <Input placeholder="27XXXXX1234Z1Z5" value={form.gstNumber} onChange={e => F('gstNumber', e.target.value)} />
                </Field>
                <Field label={`${form.providerType === 'Laboratory' ? 'Laboratory' : 'Drug'} License Number`}>
                  <Input placeholder="DL-XX-XXXXXX" value={form.drugLicenseNumber} onChange={e => F('drugLicenseNumber', e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="License Expiry Date">
                  <Input type="date" value={form.licenseExpiry} onChange={e => F('licenseExpiry', e.target.value)} />
                </Field>
                {form.providerType === 'Laboratory' ? (
                  <Field label="Laboratory Type" required>
                    <select value={form.apiProviderName || 'Pathology'} onChange={e => F('apiProviderName', e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none text-slate-700 font-bold">
                      <option value="Pathology">Pathology</option>
                      <option value="Diagnostic Centre">Diagnostic Centre</option>
                      <option value="Microbiology">Microbiology</option>
                      <option value="Radiology">Radiology</option>
                      <option value="Multi-speciality Lab">Multi-speciality Lab</option>
                    </select>
                  </Field>
                ) : (
                  <Field label="Invoice Prefix">
                    <Input placeholder="PHR" value={form.invoicePrefix} onChange={e => F('invoicePrefix', e.target.value)} />
                  </Field>
                )}
              </div>
              <Field label="Reorder Threshold (units)">
                <Input type="number" min={0} placeholder="10" value={form.reorderThreshold} onChange={e => F('reorderThreshold', Number(e.target.value))} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                {[['barcodeEnabled', 'Barcode Scanner Enabled'], ['printerEnabled', 'Label Printer Enabled']].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition">
                    <input type="checkbox" checked={form[key]} onChange={e => F(key, e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                    <span className="text-sm font-semibold text-slate-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Review */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarGrad(form.name)} flex items-center justify-center text-white font-black text-lg`}>
                    {initials(form.name)}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900">{form.name || 'Provider Name'}</h4>
                    <span className="text-xs text-blue-600 font-bold">{form.providerSubtype} {form.providerType}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ['Manager', form.contactPerson],
                    ['Phone', form.phone],
                    ['Email', form.email],
                    ['Address', [form.address?.line1, form.address?.city, form.address?.state].filter(Boolean).join(', ')],
                    ['License', form.drugLicenseNumber],
                    ['GST', form.gstNumber],
                    ['Working Hours', `${form.workingHours.openingTime} – ${form.workingHours.closingTime}`],
                    form.providerType === 'Laboratory' ? ['Lab Type', form.apiProviderName || 'Pathology'] : ['Invoice Prefix', form.invoicePrefix]
                  ].map(([label, val]) => (
                    <div key={label}>
                      <span className="text-[10px] text-slate-400 font-black uppercase">{label}</span>
                      <p className="font-semibold text-slate-800 text-xs mt-0.5">{val || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-400 text-center">Review all details before creating the provider. You can edit them later from the Manage panel.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center flex-shrink-0 bg-slate-50/50">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition">
            Cancel
          </button>
          <div className="flex gap-3">
            {step > 1 && (
              <button onClick={onPrev} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 transition">
                <ChevronLeft className="w-4 h-4" /> Back
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
                Create {form.providerType}
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
