import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import Button from '../components/common/Button';
import Card from '../components/common/Card';
import ErrorState from '../components/common/ErrorState';
import Input from '../components/common/Input';
import { getDefaultRouteForRole } from '../constants/routes';
import useAuth from '../hooks/useAuth';
import aiApi from '../api/aiApi';

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
    role: 'RECEPTIONIST',
    gender: 'male',
    dateOfBirth: '',
    age: '',
    address: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    }
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractionMessage, setExtractionMessage] = useState('');
  const [error, setError] = useState('');

  if (isAuthenticated && !loading) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateNestedField = (group, name, value) => {
    setForm((current) => ({
      ...current,
      [group]: {
        ...current[group],
        [name]: value
      }
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

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
                country: form.address.country.trim() || 'India'
              }
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
      
      // Extract 6-digit pincode from raw text if not explicitly in fields
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

      // Auto-switch role to PATIENT if ID is uploaded, since this is standard for patient self-registration
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-stone-100 via-white to-emerald-50 px-4 py-8">
      <Card className="w-full max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">AI-CMS</p>
        <h1 className="mt-3 text-3xl font-semibold text-stone-900">Create account</h1>
        <p className="mt-2 text-sm text-stone-600">
          Register a patient or staff account for the clinic workspace. Admin and super admin accounts stay seed-controlled.
        </p>

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

          <label className="grid gap-2 text-sm font-medium text-stone-700">
            <span>Role</span>
            <select
              value={form.role}
              onChange={(event) => updateField('role', event.target.value)}
              className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            >
              {REGISTRATION_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>
          <div className="md:col-span-2 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
            Receptionist and doctor accounts unlock the clinic workflow modules. Patient accounts stay focused on the symptom chatbot.
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
                    className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
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
                    onChange={(event) => updateField('dateOfBirth', event.target.value)}
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  <span>Age</span>
                  <Input
                    type="number"
                    value={form.age}
                    onChange={(event) => updateField('age', event.target.value)}
                    placeholder="25"
                  />
                </label>
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

          <div className="md:col-span-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating account...' : 'Create account'}
            </Button>
          </div>
        </form>

        <p className="mt-6 text-sm text-stone-600">
          Already registered?{' '}
          <Link className="font-semibold text-emerald-700 hover:text-emerald-800" to="/login">
            Go to login
          </Link>
        </p>
      </Card>
    </div>
  );
};

export default RegisterPage;
