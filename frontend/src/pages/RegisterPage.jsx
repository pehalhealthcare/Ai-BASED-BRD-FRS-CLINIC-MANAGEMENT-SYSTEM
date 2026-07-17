import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import Button from '../components/common/Button';
import Card from '../components/common/Card';
import ErrorState from '../components/common/ErrorState';
import Input from '../components/common/Input';
import { getDefaultRouteForRole } from '../constants/routes';
import useAuth from '../hooks/useAuth';
import aiApi from '../api/aiApi';
import MapPicker from '../components/common/MapPicker';
import { 
  Heart, Pill, FlaskConical, AlertTriangle, Shield, User, Users, Building2, CheckCircle2, Calendar
} from 'lucide-react';

const REGISTRATION_ROLES = [
  { value: 'RECEPTIONIST', label: 'Receptionist' },
  { value: 'DOCTOR', label: 'Doctor' },
  { value: 'PATIENT', label: 'Patient' },
  { value: 'PHARMACIST', label: 'Pharmacist' },
  { value: 'LAB_TECHNICIAN', label: 'Lab Technician' }
];

const RegisterPage = () => {
  const { register, isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'PATIENT',
    gender: 'male',
    dateOfBirth: '',
    age: '',
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

  const [permanentAddress, setPermanentAddress] = useState({
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    latitude: null,
    longitude: null
  });
  const [isSameAddress, setIsSameAddress] = useState(true);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapTarget, setMapTarget] = useState('current'); // 'current' or 'permanent'

  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractionMessage, setExtractionMessage] = useState('');
  const [error, setError] = useState('');

  const [step, setStep] = useState(1);
  const [medicalHistory, setMedicalHistory] = useState({
    chronicDiseases: [],
    otherChronicDisease: '',
    allergies: [],
    otherAllergy: '',
    currentMedications: [{ name: '', frequency: '' }],
    pastSurgeries: [{ name: '', year: '' }],
    familyHistory: [{ relation: '', condition: '' }],
    lifestyle: {
      smoking: 'no',
      alcohol: 'no',
      exerciseFrequency: '',
      dietType: ''
    },
    pregnancyHistory: '',
    lmpDate: ''
  });

  if (isAuthenticated && !loading) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }

  const calculateAge = (dobString) => {
    if (!dobString) return '';
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return '';
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age < 0 ? 0 : age;
  };

  const handleDobChange = (dobValue) => {
    const ageValue = calculateAge(dobValue);
    setForm((current) => ({
      ...current,
      dateOfBirth: dobValue,
      age: ageValue !== '' ? Number(ageValue) : ''
    }));
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateNestedField = (group, name, value) => {
    setForm((current) => {
      const updatedNested = {
        ...current[group],
        [name]: value
      };
      const updated = {
        ...current,
        [group]: updatedNested
      };
      if (group === 'address' && isSameAddress) {
        setPermanentAddress((prev) => ({
          ...prev,
          [name]: value
        }));
      }
      return updated;
    });
  };

  const handleMapSelect = (addr) => {
    if (mapTarget === 'current') {
      setForm((current) => ({
        ...current,
        address: {
          ...current.address,
          line1: addr.line1,
          line2: addr.line2,
          city: addr.city,
          state: addr.state,
          pincode: addr.pincode,
          country: addr.country,
          latitude: addr.latitude,
          longitude: addr.longitude
        }
      }));
      if (isSameAddress) {
        setPermanentAddress({
          line1: addr.line1,
          line2: addr.line2,
          city: addr.city,
          state: addr.state,
          pincode: addr.pincode,
          country: addr.country,
          latitude: addr.latitude,
          longitude: addr.longitude
        });
      }
    } else {
      setPermanentAddress({
        line1: addr.line1,
        line2: addr.line2,
        city: addr.city,
        state: addr.state,
        pincode: addr.pincode,
        country: addr.country,
        latitude: addr.latitude,
        longitude: addr.longitude
      });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (form.role === 'PATIENT' && step === 1) {
      if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.password) {
        setError('Name, Email, Phone, and Password are required.');
        return;
      }
      setStep(2);
      return;
    }

    setSubmitting(true);

    const payloadChronic = [...medicalHistory.chronicDiseases];
    if (medicalHistory.otherChronicDisease.trim()) {
      payloadChronic.push(medicalHistory.otherChronicDisease.trim());
    }

    const payloadAllergies = [...medicalHistory.allergies];
    if (medicalHistory.otherAllergy.trim()) {
      payloadAllergies.push(medicalHistory.otherAllergy.trim());
    }

    const payloadMeds = medicalHistory.currentMedications.filter(med => med.name.trim());
    const payloadSurgeries = medicalHistory.pastSurgeries.filter(surg => surg.name.trim());
    const payloadFamily = medicalHistory.familyHistory.filter(f => f.relation.trim() && f.condition.trim());

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        phone: form.phone.trim() || undefined,
        ...(form.role === 'PATIENT'
          ? {
              gender: form.gender,
              dateOfBirth: form.dateOfBirth || undefined,
              age: form.age ? Number(form.age) : undefined,
              address: {
                line1: form.address.line1.trim(),
                line2: form.address.line2.trim(),
                city: form.address.city.trim(),
                state: form.address.state.trim(),
                pincode: form.address.pincode.trim(),
                country: form.address.country.trim() || 'India',
                latitude: form.address.latitude || null,
                longitude: form.address.longitude || null
              },
              permanentAddress: {
                line1: isSameAddress ? form.address.line1.trim() : permanentAddress.line1.trim(),
                line2: isSameAddress ? form.address.line2.trim() : permanentAddress.line2.trim(),
                city: isSameAddress ? form.address.city.trim() : permanentAddress.city.trim(),
                state: isSameAddress ? form.address.state.trim() : permanentAddress.state.trim(),
                pincode: isSameAddress ? form.address.pincode.trim() : permanentAddress.pincode.trim(),
                country: (isSameAddress ? form.address.country.trim() : permanentAddress.country.trim()) || 'India',
                latitude: isSameAddress ? form.address.latitude || null : permanentAddress.latitude || null,
                longitude: isSameAddress ? form.address.longitude || null : permanentAddress.longitude || null
              },
              chronicConditions: payloadChronic,
              allergies: payloadAllergies,
              currentMedications: payloadMeds,
              pastSurgeries: payloadSurgeries,
              familyHistory: payloadFamily,
              lifestyle: medicalHistory.lifestyle,
              pregnancyHistory: form.gender === 'female' ? medicalHistory.pregnancyHistory : undefined,
              lmpDate: form.gender === 'female' && medicalHistory.lmpDate ? medicalHistory.lmpDate : undefined
            }
          : {})
      };

      await register(payload);
      navigate(getDefaultRouteForRole(form.role), { replace: true });
    } catch (registerError) {
      setError(registerError?.response?.data?.message || registerError?.message || 'Unable to register.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError('');
      setExtractionMessage('');
    }
  };

  const handleExtract = async () => {
    if (!selectedFile) return;

    setExtracting(true);
    setError('');
    setExtractionMessage('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('document_type', 'patient_id');
      formData.append('mask_sensitive_fields', 'false');
      
      const response = await aiApi.publicOcrExtract(formData);
      const output = response?.output || response;
      const fields = output?.extracted_fields || output?.fields || output || {};
      
      console.log('OCR raw response:', response);
      console.log('OCR extracted fields:', fields);

      const name = fields.name?.value || '';
      const phone = (fields.phone?.value || '').replace(/[^\d+]/g, '');
      const email = fields.email?.value || '';
      const gender = fields.gender?.value?.toLowerCase() || '';
      const dateOfBirth = fields.dob?.value || fields.date_of_birth?.value || fields.dateOfBirth?.value || '';
      const age = fields.age?.value || '';
      const addressVal = fields.address?.value || '';
      
      const rawText = output?.raw_text || '';
      const pincodeMatch = rawText.match(/\b\d{6}\b/);
      const pincode = fields.pincode?.value || fields.postal_code?.value || (pincodeMatch ? pincodeMatch[0] : '');

      setForm((current) => ({
        ...current,
        ...(name ? { name } : {}),
        ...(phone ? { phone } : {}),
        ...(email ? { email } : {}),
        ...(gender && ['male', 'female', 'other'].includes(gender) ? { gender } : {}),
        ...(dateOfBirth ? { dateOfBirth: dateOfBirth.slice(0, 10) } : {}),
        ...(age ? { age: Number(age) } : {}),
        address: {
          ...current.address,
          ...(addressVal ? { line1: addressVal } : {}),
          ...(pincode ? { pincode } : {})
        }
      }));

      setForm((current) => ({
        ...current,
        role: 'PATIENT'
      }));

      setExtractionMessage('Document details auto-filled via AI. Please review and correct any inaccuracies.');
    } catch (extractError) {
      console.error('OCR Extraction failed:', extractError);
      setError(extractError.message || 'Unable to extract document details.');
    } finally {
      setExtracting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* ── HEADER ── */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Heart size={20} fill="currentColor" />
          </div>
          <span className="text-lg font-black tracking-tight text-slate-900">
            AICMS <span className="text-blue-600 font-bold">Portal</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link to="/" className="text-xs font-bold text-slate-600 hover:text-blue-650 transition">
            Back to Home
          </Link>
        </div>
      </header>

      {/* ── SPLIT BODY ── */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-6 gap-8 items-stretch">
        
        {/* Left Side: Benefits and Stats */}
        <div className="flex-1 bg-white border border-slate-200/60 rounded-3xl p-8 flex flex-col justify-between shadow-sm">
          <div className="space-y-6">
            <span className="inline-block px-3 py-1 rounded-full bg-purple-50 border border-purple-100 text-[10px] font-bold text-purple-650 uppercase tracking-wider">
              Patient Portal Access
            </span>
            <h2 className="text-3xl font-black text-slate-900 leading-tight">
              Smart Healthcare, <br />
              <span className="text-purple-600">Simplified for You</span>
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed max-w-md">
              Access your prescriptions, schedule clinic visits, receive lab results, and chat with our smart triage assistant.
            </p>

            {/* Benefits Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4">
              {[
                { title: 'Easy Appointments', desc: 'Book appointments with verified doctors in just a few clicks.', icon: <Calendar size={18} />, color: 'text-teal-500', bg: 'bg-teal-50' },
                { title: 'Quality Healthcare', desc: 'Connect with experienced and trusted healthcare professionals.', icon: <CheckCircle2 size={18} />, color: 'text-blue-500', bg: 'bg-blue-50' },
                { title: 'Medicine Delivery', desc: 'Order medicines online and get them delivered fast to your doorstep.', icon: <Pill size={18} />, color: 'text-purple-500', bg: 'bg-purple-50' },
                { title: 'Lab Tests at Home', desc: 'Book lab tests with home sample collection and get digital reports.', icon: <FlaskConical size={18} />, color: 'text-amber-500', bg: 'bg-amber-50' },
                { title: '24/7 Emergency', desc: 'Get instant help in medical emergencies anytime, anywhere.', icon: <AlertTriangle size={18} />, color: 'text-rose-500', bg: 'bg-rose-50' },
                { title: 'Secure & Private', desc: 'Your health data is 100% secure and confidential with us.', icon: <Shield size={18} />, color: 'text-indigo-500', bg: 'bg-indigo-50' }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className={`w-8 h-8 rounded-lg ${item.bg} ${item.color} flex items-center justify-center shrink-0`}>
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="border-t border-slate-100 mt-10 pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Happy Patients', value: '50K+', icon: <Users size={14} className="text-teal-600" /> },
              { label: 'Expert Doctors', value: '1K+', icon: <User size={14} className="text-blue-600" /> },
              { label: 'Clinics & Hospitals', value: '500+', icon: <Building2 size={14} className="text-purple-600" /> },
              { label: 'Secure & Safe', value: '100%', icon: <Shield size={14} className="text-emerald-600" /> }
            ].map((stat, idx) => (
              <div key={idx} className="text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-1 text-slate-900 font-black text-lg">
                  {stat.icon} <span>{stat.value}</span>
                </div>
                <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Form Card */}
        <div className="w-full lg:w-[640px] bg-white border border-slate-200/60 rounded-3xl p-8 flex flex-col justify-center shadow-sm shrink-0">
          <div>
            <h3 className="text-2xl font-black text-slate-900">Create Account</h3>
            <p className="text-xs text-slate-400 mt-1.5">
              Register a patient or staff account for the clinic workspace. Admin and super admin accounts stay seed-controlled.
            </p>
          </div>

          <div className="mt-6 flex-1">

        

        {step === 1 ? (
          <>
            <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50/50 p-4">
              <div className="grid gap-3">
                <label className="grid gap-2 text-sm font-medium text-sky-900">
                  <span>Choose ID Document (Optional)</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    disabled={extracting}
                    className="w-full rounded-xl border border-sky-300 bg-white px-3 py-2 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-sky-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-sky-700 hover:file:bg-sky-200 disabled:opacity-50"
                  />
                </label>
                {selectedFile && (
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      disabled={extracting}
                      onClick={handleExtract}
                      className="bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs px-4 py-2 rounded-xl transition duration-200"
                    >
                      {extracting ? 'Scanning...' : 'Scan & Autofill Details'}
                    </Button>
                    {extracting && <span className="text-sm font-semibold text-sky-700 animate-pulse">Extracting...</span>}
                  </div>
                )}
              </div>
              {extractionMessage && (
                <p className="mt-2 text-xs font-semibold text-emerald-700">{extractionMessage}</p>
              )}
            </div>

            <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <label className="grid gap-2 text-sm font-medium text-stone-700 md:col-span-2">
                <span>Full name</span>
                <Input
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  placeholder="Reception User"
                  required
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-stone-700">
                <span>Email</span>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-stone-700">
                <span>Phone</span>
                <Input
                  value={form.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                  placeholder="9999999999"
                />
              </label>

              <div className="md:col-span-2 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-605 text-stone-600 font-semibold">
                This is a dedicated Patient account registration. Staff, receptionist, and doctor accounts are created directly by the clinic administrator.
              </div>

              {form.role === 'PATIENT' && (
                <div className="md:col-span-2 grid gap-4 border-t border-stone-200 pt-4">
                  <h3 className="text-md font-semibold text-stone-900">Patient Profile Details</h3>
                  
                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="grid gap-2 text-sm font-medium text-stone-700">
                      <span>Gender</span>
                      <select
                        value={form.gender}
                        onChange={(event) => updateField('gender', event.target.value)}
                        className="w-full rounded-2xl border border-stone-300 bg-white text-stone-900 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-stone-700">
                      <span>Date of Birth</span>
                      <Input
                        type="date"
                        value={form.dateOfBirth}
                        onChange={(event) => handleDobChange(event.target.value)}
                        onClick={(e) => e.target.showPicker?.()}
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-stone-700">
                      <span>Age</span>
                      <Input
                        type="number"
                        value={form.age}
                        readOnly
                        className="bg-stone-100 text-stone-500 cursor-not-allowed"
                        placeholder="Calculated Age"
                      />
                    </label>
                  </div>

                  {/* Geocoding current address */}
                  <div className="flex justify-between items-center border-t border-stone-100 pt-3">
                    <span className="text-sm font-semibold text-stone-900">Current Address</span>
                    <button
                      type="button"
                      onClick={() => {
                        setMapTarget('current');
                        setShowMapPicker(true);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                    >
                      📍 Locate on Map
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-sm font-medium text-stone-700 md:col-span-2">
                      <span>Address Line 1</span>
                      <Input
                        value={form.address.line1}
                        onChange={(event) => updateNestedField('address', 'line1', event.target.value)}
                        placeholder="Street, Building name"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-stone-700">
                      <span>City</span>
                      <Input
                        value={form.address.city}
                        onChange={(event) => updateNestedField('address', 'city', event.target.value)}
                        placeholder="City name"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-stone-700">
                      <span>State</span>
                      <Input
                        value={form.address.state}
                        onChange={(event) => updateNestedField('address', 'state', event.target.value)}
                        placeholder="State name"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-stone-700">
                      <span>Pincode</span>
                      <Input
                        value={form.address.pincode}
                        onChange={(event) => updateNestedField('address', 'pincode', event.target.value)}
                        placeholder="123456"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-medium text-stone-700">
                      <span>Country</span>
                      <Input
                        value={form.address.country}
                        onChange={(event) => updateNestedField('address', 'country', event.target.value)}
                        placeholder="India"
                      />
                    </label>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-700 mt-1">
                    <input
                      type="checkbox"
                      checked={isSameAddress}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsSameAddress(checked);
                        if (checked) {
                          setPermanentAddress({ ...form.address });
                        }
                      }}
                      className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                    />
                    <span>Permanent address is same as current address</span>
                  </label>

                  {/* Conditional Permanent Address */}
                  {!isSameAddress && (
                    <div className="grid gap-4 border-t border-stone-100 pt-3 animate-slide-down">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-stone-900">Permanent Address</span>
                        <button
                          type="button"
                          onClick={() => {
                            setMapTarget('permanent');
                            setShowMapPicker(true);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                        >
                          📍 Locate on Map
                        </button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="grid gap-2 text-sm font-medium text-stone-700 md:col-span-2">
                          <span>Address Line 1</span>
                          <Input
                            value={permanentAddress.line1}
                            onChange={(event) => setPermanentAddress(prev => ({ ...prev, line1: event.target.value }))}
                            placeholder="Street, Building name"
                          />
                        </label>

                        <label className="grid gap-2 text-sm font-medium text-stone-700">
                          <span>City</span>
                          <Input
                            value={permanentAddress.city}
                            onChange={(event) => setPermanentAddress(prev => ({ ...prev, city: event.target.value }))}
                            placeholder="City name"
                          />
                        </label>

                        <label className="grid gap-2 text-sm font-medium text-stone-700">
                          <span>State</span>
                          <Input
                            value={permanentAddress.state}
                            onChange={(event) => setPermanentAddress(prev => ({ ...prev, state: event.target.value }))}
                            placeholder="State name"
                          />
                        </label>

                        <label className="grid gap-2 text-sm font-medium text-stone-700">
                          <span>Pincode</span>
                          <Input
                            value={permanentAddress.pincode}
                            onChange={(event) => setPermanentAddress(prev => ({ ...prev, pincode: event.target.value }))}
                            placeholder="123456"
                          />
                        </label>

                        <label className="grid gap-2 text-sm font-medium text-stone-700">
                          <span>Country</span>
                          <Input
                            value={permanentAddress.country}
                            onChange={(event) => setPermanentAddress(prev => ({ ...prev, country: event.target.value }))}
                            placeholder="India"
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <label className="grid gap-2 text-sm font-medium text-stone-700 md:col-span-2">
                <span>Password</span>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  placeholder="StrongPass123!"
                  required
                />
              </label>

              {error ? (
                <div className="md:col-span-2">
                  <ErrorState title="Registration failed" description={error} />
                </div>
              ) : null}

              <div className="md:col-span-2 mt-4">
                <Button type="submit" disabled={submitting}>
                  {form.role === 'PATIENT' ? 'Continue to Medical History' : 'Create account'}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <form className="mt-6 grid gap-6" onSubmit={handleSubmit}>
            <div className="border-b border-stone-200 pb-4">
              <h2 className="text-xl font-semibold text-stone-900">Medical History Form</h2>
              <p className="text-sm text-stone-600 mt-1">Please provide details to complete your patient medical profile.</p>
            </div>

            {/* Chronic Diseases Checkboxes */}
            <div className="grid gap-3">
              <span className="text-sm font-semibold text-stone-800">Chronic Diseases</span>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {['Diabetes', 'Hypertension', 'Asthma', 'Thyroid', 'Heart Disease', 'Kidney Disease', 'Cancer'].map((disease) => (
                  <label key={disease} className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={medicalHistory.chronicDiseases.includes(disease)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setMedicalHistory(prev => ({
                          ...prev,
                          chronicDiseases: checked
                            ? [...prev.chronicDiseases, disease]
                            : prev.chronicDiseases.filter(d => d !== disease)
                        }));
                      }}
                      className="w-4 h-4 accent-emerald-600 rounded"
                    />
                    <span>{disease}</span>
                  </label>
                ))}
              </div>
              <label className="grid gap-1 text-xs text-stone-600 mt-1">
                <span>Other Disease(s)</span>
                <Input
                  value={medicalHistory.otherChronicDisease}
                  onChange={(e) => setMedicalHistory(prev => ({ ...prev, otherChronicDisease: e.target.value }))}
                  placeholder="e.g. Migraine, Arthritis"
                />
              </label>
            </div>

            {/* Allergies Checkboxes */}
            <div className="grid gap-3 border-t border-stone-100 pt-4">
              <span className="text-sm font-semibold text-stone-800">Allergies</span>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {['Penicillin', 'Dust', 'Peanuts', 'Milk'].map((allergy) => (
                  <label key={allergy} className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={medicalHistory.allergies.includes(allergy)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setMedicalHistory(prev => ({
                          ...prev,
                          allergies: checked
                            ? [...prev.allergies, allergy]
                            : prev.allergies.filter(a => a !== allergy)
                        }));
                      }}
                      className="w-4 h-4 accent-emerald-600 rounded"
                    />
                    <span>{allergy}</span>
                  </label>
                ))}
              </div>
              <label className="grid gap-1 text-xs text-stone-600 mt-1">
                <span>Other Allergies</span>
                <Input
                  value={medicalHistory.otherAllergy}
                  onChange={(e) => setMedicalHistory(prev => ({ ...prev, otherAllergy: e.target.value }))}
                  placeholder="e.g. Pollen, Soy"
                />
              </label>
            </div>

            {/* Current Medications Dynamic List */}
            <div className="grid gap-3 border-t border-stone-100 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-stone-800">Current Medications</span>
                <button
                  type="button"
                  onClick={() => setMedicalHistory(prev => ({
                    ...prev,
                    currentMedications: [...prev.currentMedications, { name: '', frequency: '' }]
                  }))}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                >
                  + Add Medication
                </button>
              </div>
              {medicalHistory.currentMedications.map((med, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    value={med.name}
                    onChange={(e) => {
                      const updated = [...medicalHistory.currentMedications];
                      updated[idx].name = e.target.value;
                      setMedicalHistory(prev => ({ ...prev, currentMedications: updated }));
                    }}
                    placeholder="Medication name (e.g. Metformin 500mg)"
                  />
                  <Input
                    value={med.frequency}
                    onChange={(e) => {
                      const updated = [...medicalHistory.currentMedications];
                      updated[idx].frequency = e.target.value;
                      setMedicalHistory(prev => ({ ...prev, currentMedications: updated }));
                    }}
                    placeholder="Frequency (e.g. Twice Daily)"
                  />
                  {medicalHistory.currentMedications.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setMedicalHistory(prev => ({
                        ...prev,
                        currentMedications: prev.currentMedications.filter((_, i) => i !== idx)
                      }))}
                      className="text-rose-600 hover:text-rose-700 text-sm font-semibold px-2"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Past Surgeries Dynamic List */}
            <div className="grid gap-3 border-t border-stone-100 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-stone-800">Past Surgeries</span>
                <button
                  type="button"
                  onClick={() => setMedicalHistory(prev => ({
                    ...prev,
                    pastSurgeries: [...prev.pastSurgeries, { name: '', year: '' }]
                  }))}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                >
                  + Add Surgery
                </button>
              </div>
              {medicalHistory.pastSurgeries.map((surg, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    value={surg.name}
                    onChange={(e) => {
                      const updated = [...medicalHistory.pastSurgeries];
                      updated[idx].name = e.target.value;
                      setMedicalHistory(prev => ({ ...prev, pastSurgeries: updated }));
                    }}
                    placeholder="Surgery name (e.g. Appendix Removal)"
                  />
                  <Input
                    value={surg.year}
                    onChange={(e) => {
                      const updated = [...medicalHistory.pastSurgeries];
                      updated[idx].year = e.target.value;
                      setMedicalHistory(prev => ({ ...prev, pastSurgeries: updated }));
                    }}
                    placeholder="Year (e.g. 2022)"
                  />
                  {medicalHistory.pastSurgeries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setMedicalHistory(prev => ({
                        ...prev,
                        pastSurgeries: prev.pastSurgeries.filter((_, i) => i !== idx)
                      }))}
                      className="text-rose-600 hover:text-rose-700 text-sm font-semibold px-2"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Family History Dynamic List */}
            <div className="grid gap-3 border-t border-stone-100 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-stone-800">Family History</span>
                <button
                  type="button"
                  onClick={() => setMedicalHistory(prev => ({
                    ...prev,
                    familyHistory: [...prev.familyHistory, { relation: '', condition: '' }]
                  }))}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                >
                  + Add Record
                </button>
              </div>
              {medicalHistory.familyHistory.map((fam, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    value={fam.relation}
                    onChange={(e) => {
                      const updated = [...medicalHistory.familyHistory];
                      updated[idx].relation = e.target.value;
                      setMedicalHistory(prev => ({ ...prev, familyHistory: updated }));
                    }}
                    placeholder="Relation (e.g. Father)"
                  />
                  <Input
                    value={fam.condition}
                    onChange={(e) => {
                      const updated = [...medicalHistory.familyHistory];
                      updated[idx].condition = e.target.value;
                      setMedicalHistory(prev => ({ ...prev, familyHistory: updated }));
                    }}
                    placeholder="Disease/Condition (e.g. Diabetes)"
                  />
                  {medicalHistory.familyHistory.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setMedicalHistory(prev => ({
                        ...prev,
                        familyHistory: prev.familyHistory.filter((_, i) => i !== idx)
                      }))}
                      className="text-rose-600 hover:text-rose-700 text-sm font-semibold px-2"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Lifestyle */}
            <div className="grid gap-4 border-t border-stone-100 pt-4 md:grid-cols-2">
              <span className="text-sm font-semibold text-stone-800 md:col-span-2">Lifestyle</span>
              <label className="grid gap-2 text-sm text-stone-700">
                <span>Smoking</span>
                <select
                  value={medicalHistory.lifestyle.smoking}
                  onChange={(e) => setMedicalHistory(prev => ({
                    ...prev,
                    lifestyle: { ...prev.lifestyle, smoking: e.target.value }
                  }))}
                  className="w-full rounded-2xl border border-stone-300 bg-white text-stone-900 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                  <option value="former">Former Smoker</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm text-stone-700">
                <span>Alcohol</span>
                <select
                  value={medicalHistory.lifestyle.alcohol}
                  onChange={(e) => setMedicalHistory(prev => ({
                    ...prev,
                    lifestyle: { ...prev.lifestyle, alcohol: e.target.value }
                  }))}
                  className="w-full rounded-2xl border border-stone-300 bg-white text-stone-900 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                  <option value="occasional">Occasional</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm text-stone-700">
                <span>Exercise Frequency</span>
                <Input
                  value={medicalHistory.lifestyle.exerciseFrequency}
                  onChange={(e) => setMedicalHistory(prev => ({
                    ...prev,
                    lifestyle: { ...prev.lifestyle, exerciseFrequency: e.target.value }
                  }))}
                  placeholder="e.g. Daily, 2-3 times/week, None"
                />
              </label>

              <label className="grid gap-2 text-sm text-stone-700">
                <span>Diet Type</span>
                <Input
                  value={medicalHistory.lifestyle.dietType}
                  onChange={(e) => setMedicalHistory(prev => ({
                    ...prev,
                    lifestyle: { ...prev.lifestyle, dietType: e.target.value }
                  }))}
                  placeholder="e.g. Vegetarian, Non-Vegetarian, Vegan"
                />
              </label>
            </div>

            {/* Pregnancy History / LMP Date (For Female Patients) */}
            {form.gender === 'female' && (
              <div className="grid gap-4 border-t border-stone-100 pt-4 md:grid-cols-2">
                <span className="text-sm font-semibold text-stone-800 md:col-span-2">Pregnancy History & LMP</span>
                <label className="grid gap-2 text-sm text-stone-700">
                  <span>Pregnancy History</span>
                  <Input
                    value={medicalHistory.pregnancyHistory}
                    onChange={(e) => setMedicalHistory(prev => ({ ...prev, pregnancyHistory: e.target.value }))}
                    placeholder="Details (e.g. G2P1A0)"
                  />
                </label>
                <label className="grid gap-2 text-sm text-stone-700">
                  <span>LMP Date (Last Menstrual Period)</span>
                  <Input
                    type="date"
                    value={medicalHistory.lmpDate}
                    onChange={(e) => setMedicalHistory(prev => ({ ...prev, lmpDate: e.target.value }))}
                    onClick={(e) => e.target.showPicker?.()}
                  />
                </label>
              </div>
            )}

            {error ? (
              <div className="mt-2">
                <ErrorState title="Registration failed" description={error} />
              </div>
            ) : null}

            <div className="flex gap-3 border-t border-stone-100 pt-6">
              <Button type="button" variant="secondary" className="border border-stone-300" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating account...' : 'Complete Registration'}
              </Button>
            </div>
          </form>
        )}

            <p className="mt-6 text-center text-xs text-slate-500">
              Already registered?{' '}
              <Link className="font-bold text-teal-600 hover:underline" to="/login">
                Go to login
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* ── FOOTER BAR ── */}
      <footer className="bg-slate-905 bg-slate-900 text-[11px] font-bold text-slate-450 py-5 px-6 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 shadow-inner">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Heart size={10} fill="currentColor" />
          </div>
          <span className="text-slate-400">AICMS Portal. Your trusted partner in health and wellness.</span>
        </div>
        <div className="flex items-center gap-6 text-slate-500">
          <span>🛡 Trusted & Secure</span>
          <span>🔒 Privacy Protected</span>
          <span>📞 24/7 Support</span>
        </div>
      </footer>

      {showMapPicker && (
        <MapPicker
          isOpen={showMapPicker}
          onClose={() => setShowMapPicker(false)}
          onSelectAddress={handleMapSelect}
          initialAddress={mapTarget === 'current' ? form.address : permanentAddress}
        />
      )}
    </div>
  );
};

export default RegisterPage;
