import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import { doctorApi } from '../../lib/api';
import DoctorAvailabilityEditor from './DoctorAvailabilityEditor';

const defaultAvailability = [
  { dayOfWeek: 'monday', isAvailable: false, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30 },
  { dayOfWeek: 'tuesday', isAvailable: false, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30 },
  { dayOfWeek: 'wednesday', isAvailable: false, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30 },
  { dayOfWeek: 'thursday', isAvailable: false, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30 },
  { dayOfWeek: 'friday', isAvailable: false, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30 },
  { dayOfWeek: 'saturday', isAvailable: false, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30 },
  { dayOfWeek: 'sunday', isAvailable: false, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30 }
];

const defaultForm = {
  firstName: '',
  lastName: '',
  gender: 'other',
  phone: '',
  email: '',
  specialization: '',
  qualification: '',
  experienceYears: '',
  consultationFee: '',
  availability: defaultAvailability
};

const DoctorFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    let isMounted = true;

    const loadDoctor = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await doctorApi.get(id);
        const doctor = response.data.doctor;

        if (!isMounted) {
          return;
        }

        setForm({
          firstName: doctor?.firstName || '',
          lastName: doctor?.lastName || '',
          gender: doctor?.gender || 'other',
          phone: doctor?.phone || '',
          email: doctor?.email || '',
          specialization: doctor?.specialization || '',
          qualification: doctor?.qualification || '',
          experienceYears: doctor?.experienceYears ?? '',
          consultationFee: doctor?.consultationFee ?? '',
          availability: doctor?.availability?.length ? doctor.availability : defaultAvailability
        });
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load doctor.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDoctor();

    return () => {
      isMounted = false;
    };
  }, [id, isEditMode]);

  const pageTitle = useMemo(() => (isEditMode ? 'Edit doctor' : 'Create doctor'), [isEditMode]);

  const updateField = (name, value) => {
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.firstName.trim() || !form.specialization.trim() || !form.phone.trim()) {
      setError('First name, specialization, and phone are required.');
      return;
    }

    setSubmitting(true);

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim() || undefined,
      gender: form.gender || undefined,
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      specialization: form.specialization.trim(),
      qualification: form.qualification.trim() || undefined,
      experienceYears: form.experienceYears === '' ? undefined : Number(form.experienceYears),
      consultationFee: form.consultationFee === '' ? undefined : Number(form.consultationFee),
      availability: form.availability
    };

    try {
      const response = isEditMode ? await doctorApi.update(id, payload) : await doctorApi.create(payload);
      navigate(`/doctors/${response.data.doctor._id}`, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save doctor.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading doctor form..." />;
  }

  if (error && isEditMode && !form.firstName) {
    return <ErrorState title="Doctor unavailable" description={error} />;
  }

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-3 rounded-3xl border border-stone-200 bg-white dark:bg-stone-800 p-6 shadow-lg shadow-stone-200/40 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Doctors</p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-900">{pageTitle}</h2>
        </div>
        <Link className="text-sm font-semibold text-emerald-700 hover:text-emerald-800" to="/doctors">
          Back to doctor list
        </Link>
      </div>

      <form className="grid gap-6" onSubmit={handleSubmit}>
        <div className="grid gap-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-stone-700 dark:text-gray-100">
            First name
            <input className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-gray-900 dark:text-gray-100 bg-white dark:bg-stone-700" value={form.firstName} onChange={(event) => updateField('firstName', event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm text-stone-700 dark:text-gray-100">
            Last name
            <input className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-gray-900 dark:text-gray-100 bg-white dark:bg-stone-700" value={form.lastName} onChange={(event) => updateField('lastName', event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm text-stone-700 dark:text-gray-100">
            Gender
            <select className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-gray-900 dark:text-gray-100 bg-white dark:bg-stone-700" value={form.gender} onChange={(event) => updateField('gender', event.target.value)}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-stone-700 dark:text-gray-100">
            Phone
            <input className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-gray-900 dark:text-gray-100 bg-white dark:bg-stone-700" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm text-stone-700 dark:text-gray-100">
            Email
            <input type="email" className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-gray-900 dark:text-gray-100 bg-white dark:bg-stone-700" value={form.email} onChange={(event) => updateField('email', event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm text-stone-700 dark:text-gray-100">
            Specialization
            <input className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-gray-900 dark:text-gray-100 bg-white dark:bg-stone-700" value={form.specialization} onChange={(event) => updateField('specialization', event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm text-stone-700 dark:text-gray-100">
            Qualification
            <input className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-gray-900 dark:text-gray-100 bg-white dark:bg-stone-700" value={form.qualification} onChange={(event) => updateField('qualification', event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm text-stone-700 dark:text-gray-100">
            Experience years
            <input type="number" min="0" className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-gray-900 dark:text-gray-100 bg-white dark:bg-stone-700" value={form.experienceYears} onChange={(event) => updateField('experienceYears', event.target.value)} />
          </label>
          <label className="grid gap-2 text-sm text-stone-700 dark:text-gray-100">
            Consultation fee
            <input type="number" min="0" className="rounded-2xl border border-stone-300 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-gray-900 dark:text-gray-100 bg-white dark:bg-stone-700" value={form.consultationFee} onChange={(event) => updateField('consultationFee', event.target.value)} />
          </label>
        </div>

        <div className="grid gap-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
          <div>
            <h3 className="text-lg font-semibold text-stone-900">Availability</h3>
            <p className="mt-2 text-sm text-stone-600">Set baseline weekly availability for future appointment scheduling.</p>
          </div>
          <DoctorAvailabilityEditor value={form.availability} onChange={(availability) => updateField('availability', availability)} />
        </div>

        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={submitting} className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">
            {submitting ? 'Saving...' : isEditMode ? 'Save changes' : 'Create doctor'}
          </button>
          <Link className="rounded-2xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50" to={isEditMode ? `/doctors/${id}` : '/doctors'}>
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
};

export default DoctorFormPage;
