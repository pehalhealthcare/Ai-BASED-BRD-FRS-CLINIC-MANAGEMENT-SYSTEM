import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import { doctorApi, patientApi } from '../../lib/api';
import { createAppointment, getAvailableSlots } from './appointmentApi';
import AppointmentForm from './components/AppointmentForm';

const defaultForm = {
  patientId: '',
  doctorId: '',
  appointmentDate: '',
  startTime: '',
  durationMinutes: 30,
  appointmentType: 'scheduled',
  reasonForVisit: '',
  symptomsSummary: '',
  source: 'reception',
  isEarlyBooking: false,
  earlyBookingReason: 'none'
};

const AppointmentCreatePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState(defaultForm);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const patientId = searchParams.get('patientId');

    if (!patientId) {
      return;
    }

    setForm((current) => ({
      ...current,
      patientId: current.patientId || patientId
    }));
  }, [searchParams]);

  useEffect(() => {
    let isMounted = true;

    const loadDependencies = async () => {
      setLoading(true);
      setError('');

      try {
        const [patientResponse, doctorResponse] = await Promise.all([
          patientApi.list({ limit: 100, isActive: true }),
          doctorApi.list({ limit: 100, isActive: true })
        ]);

        if (!isMounted) {
          return;
        }

        setPatients(patientResponse.data.patients || []);
        setDoctors(doctorResponse.data.doctors || []);
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load appointment dependencies.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDependencies();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSlots = async () => {
      if (!form.doctorId || !form.appointmentDate || !form.durationMinutes) {
        setSlots([]);
        return;
      }

      setLoadingSlots(true);

      try {
        const response = await getAvailableSlots({
          doctorId: form.doctorId,
          date: form.appointmentDate,
          durationMinutes: form.durationMinutes
        });

        if (isMounted) {
          setSlots(response.data.slots || []);
        }
      } catch (requestError) {
        if (isMounted) {
          setSlots([]);
          setError(requestError.response?.data?.message || 'Unable to fetch available slots.');
        }
      } finally {
        if (isMounted) {
          setLoadingSlots(false);
        }
      }
    };

    loadSlots();

    return () => {
      isMounted = false;
    };
  }, [form.doctorId, form.appointmentDate, form.durationMinutes]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.patientId || !form.doctorId || !form.appointmentDate || !form.startTime) {
      setError('Patient, doctor, appointment date, and slot are required.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await createAppointment(form);
      navigate(`/appointments/${response.data.appointment._id}`, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading appointment workspace..." />;
  }

  if (error && !patients.length && !doctors.length) {
    return <ErrorState title="Appointment creation unavailable" description={error} />;
  }

  if (!patients.length || !doctors.length) {
    return (
      <EmptyState
        title="Patients and doctors are required first"
        description="Create at least one active patient and one active doctor before booking an appointment."
        action={
          <div className="flex flex-wrap gap-3">
            <Link className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50" to="/patients/new">
              Create patient
            </Link>
            <Link className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700" to="/doctors/new">
              Create doctor
            </Link>
          </div>
        }
      />
    );
  }

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-3 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Appointments</p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-900">Book appointment</h2>
          <p className="mt-2 text-sm text-stone-600">Use doctor availability and live slot checks to avoid double booking.</p>
        </div>
        <Link className="text-sm font-semibold text-emerald-700 hover:text-emerald-800" to="/appointments">
          Back to appointments
        </Link>
      </div>
      <AppointmentForm form={form} onChange={setForm} onSubmit={handleSubmit} patients={patients} doctors={doctors} slots={slots} loadingSlots={loadingSlots} submitting={submitting} error={error} />
    </section>
  );
};

export default AppointmentCreatePage;
