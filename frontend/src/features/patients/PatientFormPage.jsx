import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import { patientApi } from '../../lib/api';
import PatientDocumentOcrPanel from './PatientDocumentOcrPanel';

const defaultForm = {
  firstName: '',
  lastName: '',
  gender: 'male',
  dateOfBirth: '',
  phone: '',
  email: '',
  bloodGroup: '',
  allergies: '',
  chronicConditions: '',
  currentMedications: '',
  address: {
    line1: '',
    line2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India'
  },
  emergencyContact: {
    name: '',
    relation: '',
    phone: ''
  }
};

const splitCommaSeparated = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const PatientFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    let isMounted = true;

    const loadPatient = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await patientApi.get(id);
        const patient = response.data.patient;

        if (!isMounted) {
          return;
        }

        setForm({
          firstName: patient?.firstName || '',
          lastName: patient?.lastName || '',
          gender: patient?.gender || 'male',
          dateOfBirth: patient?.dateOfBirth ? patient.dateOfBirth.slice(0, 10) : '',
          phone: patient?.phone || '',
          email: patient?.email || '',
          bloodGroup: patient?.bloodGroup || '',
          allergies: (patient?.allergies || []).join(', '),
          chronicConditions: (patient?.chronicConditions || []).join(', '),
          currentMedications: (patient?.currentMedications || []).join(', '),
          address: {
            line1: patient?.address?.line1 || '',
            line2: patient?.address?.line2 || '',
            city: patient?.address?.city || '',
            state: patient?.address?.state || '',
            pincode: patient?.address?.pincode || '',
            country: patient?.address?.country || 'India'
          },
          emergencyContact: {
            name: patient?.emergencyContact?.name || '',
            relation: patient?.emergencyContact?.relation || '',
            phone: patient?.emergencyContact?.phone || ''
          }
        });
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load patient.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPatient();

    return () => {
      isMounted = false;
    };
  }, [id, isEditMode]);

  const pageTitle = useMemo(() => (isEditMode ? 'Edit patient' : 'Create patient'), [isEditMode]);

  const updateField = (name, value) => {
    setForm((current) => ({
      ...current,
      [name]: value
    }));
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

  const handleOcrApply = (extracted = {}) => {
    setForm((current) => ({
      ...current,
      firstName: extracted.firstName || current.firstName,
      lastName: extracted.lastName || current.lastName,
      phone: extracted.phone || current.phone,
      email: extracted.email || current.email,
      dateOfBirth: extracted.dateOfBirth?.slice?.(0, 10) || extracted.dateOfBirth || current.dateOfBirth,
      gender: ['male', 'female', 'other'].includes(extracted.gender) ? extracted.gender : current.gender,
      address: {
        ...current.address,
        line1: extracted.address?.line1 || current.address.line1,
        city: extracted.address?.city || current.address.city,
        state: extracted.address?.state || current.address.state,
        pincode: extracted.address?.pincode || current.address.pincode
      }
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!form.firstName.trim() || !form.phone.trim() || !form.gender) {
      setError('First name, gender, and phone are required.');
      return;
    }

    setSubmitting(true);

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim() || undefined,
      gender: form.gender,
      dateOfBirth: form.dateOfBirth || undefined,
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      bloodGroup: form.bloodGroup.trim() || undefined,
      allergies: splitCommaSeparated(form.allergies),
      chronicConditions: splitCommaSeparated(form.chronicConditions),
      currentMedications: splitCommaSeparated(form.currentMedications),
      address: {
        line1: form.address.line1.trim(),
        line2: form.address.line2.trim(),
        city: form.address.city.trim(),
        state: form.address.state.trim(),
        pincode: form.address.pincode.trim(),
        country: form.address.country.trim() || 'India'
      },
      emergencyContact: {
        name: form.emergencyContact.name.trim(),
        relation: form.emergencyContact.relation.trim(),
        phone: form.emergencyContact.phone.trim()
      }
    };

    try {
      const response = isEditMode ? await patientApi.update(id, payload) : await patientApi.create(payload);
      const patient = response.data.patient;

      setSuccessMessage(isEditMode ? 'Patient updated successfully.' : 'Patient created successfully.');
      navigate(`/patients/${patient._id}`, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save patient.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading patient form..." />;
  }

  if (error && isEditMode && !form.firstName) {
    return <ErrorState title="Patient unavailable" description={error} />;
  }

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-3 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Patients</p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-900">{pageTitle}</h2>
        </div>
        <Link className="text-sm font-semibold text-emerald-700 hover:text-emerald-800" to="/patients">
          Back to patient list
        </Link>
      </div>

      <PatientDocumentOcrPanel onApply={handleOcrApply} />

      <form className="grid gap-6" onSubmit={handleSubmit}>
        <div className="grid gap-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-stone-700">
            First name
            <input className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" value={form.firstName} onChange={(event) => updateField('firstName', event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm text-stone-700">
            Last name
            <input className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" value={form.lastName} onChange={(event) => updateField('lastName', event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm text-stone-700">
            Gender
            <select className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" value={form.gender} onChange={(event) => updateField('gender', event.target.value)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-stone-700">
            Date of birth
            <input type="date" className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" value={form.dateOfBirth} onChange={(event) => updateField('dateOfBirth', event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm text-stone-700">
            Phone
            <input className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm text-stone-700">
            Email
            <input type="email" className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" value={form.email} onChange={(event) => updateField('email', event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm text-stone-700">
            Blood group
            <input className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" value={form.bloodGroup} onChange={(event) => updateField('bloodGroup', event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm text-stone-700">
            Allergies
            <input className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" value={form.allergies} onChange={(event) => updateField('allergies', event.target.value)} placeholder="Dust, Penicillin" />
          </label>
          <label className="grid gap-2 text-sm text-stone-700 md:col-span-2">
            Chronic conditions
            <input className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" value={form.chronicConditions} onChange={(event) => updateField('chronicConditions', event.target.value)} placeholder="Diabetes, Hypertension" />
          </label>
          <label className="grid gap-2 text-sm text-stone-700 md:col-span-2">
            Current medications
            <input className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" value={form.currentMedications} onChange={(event) => updateField('currentMedications', event.target.value)} placeholder="Metformin, Vitamin D" />
          </label>
        </div>

        <div className="grid gap-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 md:grid-cols-2">
          <h3 className="md:col-span-2 text-lg font-semibold text-stone-900">Address</h3>
          {['line1', 'line2', 'city', 'state', 'pincode', 'country'].map((field) => (
            <label key={field} className="grid gap-2 text-sm capitalize text-stone-700">
              {field}
              <input
                className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                value={form.address[field]}
                onChange={(event) => updateNestedField('address', field, event.target.value)}
              />
            </label>
          ))}
        </div>

        <div className="grid gap-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 md:grid-cols-3">
          <h3 className="md:col-span-3 text-lg font-semibold text-stone-900">Emergency contact</h3>
          {['name', 'relation', 'phone'].map((field) => (
            <label key={field} className="grid gap-2 text-sm capitalize text-stone-700">
              {field}
              <input
                className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                value={form.emergencyContact[field]}
                onChange={(event) => updateNestedField('emergencyContact', field, event.target.value)}
              />
            </label>
          ))}
        </div>

        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        {successMessage ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</p> : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Saving...' : isEditMode ? 'Save changes' : 'Create patient'}
          </button>
          <Link className="rounded-2xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50" to={isEditMode ? `/patients/${id}` : '/patients'}>
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
};

export default PatientFormPage;
