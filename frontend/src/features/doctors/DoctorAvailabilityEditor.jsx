import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import { doctorApi } from '../../lib/api';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const buildDefaultAvailability = (existing = []) =>
  DAYS.map((day) => {
    const match = existing.find((item) => item.dayOfWeek === day);

    return {
      dayOfWeek: day,
      isAvailable: match?.isAvailable || false,
      startTime: match?.startTime || '09:00',
      endTime: match?.endTime || '17:00',
      slotDurationMinutes: match?.slotDurationMinutes || 30
    };
  });

const AvailabilityFields = ({ availability, onChange }) => {
  const updateAvailability = (dayOfWeek, field, value) => {
    onChange(
      availability.map((item) =>
        item.dayOfWeek === dayOfWeek
          ? {
              ...item,
              [field]: field === 'isAvailable' ? value : field === 'slotDurationMinutes' ? Number(value) : value
            }
          : item
      )
    );
  };

  return (
    <div className="grid gap-4">
      {availability.map((item) => (
        <div key={item.dayOfWeek} className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 lg:grid-cols-[1fr_auto_auto_auto_auto] lg:items-center">
          <div>
            <p className="text-sm font-semibold capitalize text-stone-900">{item.dayOfWeek}</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={item.isAvailable} onChange={(event) => updateAvailability(item.dayOfWeek, 'isAvailable', event.target.checked)} />
            Available
          </label>
          <input type="time" value={item.startTime} onChange={(event) => updateAvailability(item.dayOfWeek, 'startTime', event.target.value)} className="rounded-xl border border-stone-300 px-3 py-2 text-sm" />
          <input type="time" value={item.endTime} onChange={(event) => updateAvailability(item.dayOfWeek, 'endTime', event.target.value)} className="rounded-xl border border-stone-300 px-3 py-2 text-sm" />
          <input type="number" min="5" step="5" value={item.slotDurationMinutes} onChange={(event) => updateAvailability(item.dayOfWeek, 'slotDurationMinutes', event.target.value)} className="rounded-xl border border-stone-300 px-3 py-2 text-sm" />
        </div>
      ))}
    </div>
  );
};

const DoctorAvailabilityEditor = ({ value, onChange }) => {
  const controlled = Array.isArray(value) && typeof onChange === 'function';
  const { id } = useParams();
  const navigate = useNavigate();
  const [availability, setAvailability] = useState(buildDefaultAvailability());
  const [doctorName, setDoctorName] = useState('');
  const [loading, setLoading] = useState(!controlled);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const currentAvailability = useMemo(() => (controlled ? buildDefaultAvailability(value) : availability), [controlled, value, availability]);
  const updateCurrentAvailability = controlled ? onChange : setAvailability;

  useEffect(() => {
    if (controlled || !id) {
      return;
    }

    let isMounted = true;

    const loadDoctor = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await doctorApi.get(id);

        if (isMounted) {
          setDoctorName(response.data.doctor?.fullName || 'Doctor');
          setAvailability(buildDefaultAvailability(response.data.doctor?.availability || []));
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load doctor availability.');
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
  }, [controlled, id]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (controlled || !id) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await doctorApi.updateAvailability(id, {
        availability: currentAvailability
      });
      navigate(`/doctors/${id}`, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update doctor availability.');
    } finally {
      setSubmitting(false);
    }
  };

  if (controlled) {
    return <AvailabilityFields availability={currentAvailability} onChange={updateCurrentAvailability} />;
  }

  if (loading) {
    return <LoadingState label="Loading doctor availability..." />;
  }

  if (error && !doctorName) {
    return <ErrorState title="Availability unavailable" description={error} />;
  }

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-3 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Doctor availability</p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-900">{doctorName || 'Doctor'}</h2>
        </div>
        <Link className="text-sm font-semibold text-emerald-700 hover:text-emerald-800" to={`/doctors/${id}`}>
          Back to doctor profile
        </Link>
      </div>

      <form className="grid gap-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40" onSubmit={handleSubmit}>
        <AvailabilityFields availability={currentAvailability} onChange={updateCurrentAvailability} />
        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={submitting} className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">
            {submitting ? 'Saving...' : 'Save availability'}
          </button>
          <Link className="rounded-2xl border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50" to={`/doctors/${id}`}>
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
};

export default DoctorAvailabilityEditor;
