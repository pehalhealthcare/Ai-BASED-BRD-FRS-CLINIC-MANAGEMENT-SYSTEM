import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import { getCurrentUserFromStorage } from '../../lib/auth';
import { sendAppointmentReminder } from '../notifications/notificationsApi';
import { cancelAppointment, getAppointmentById, rescheduleAppointment, updateAppointmentStatus } from './appointmentApi';
import AppointmentConsultationButton from './AppointmentConsultationButton';
import AppointmentStatusBadge from './components/AppointmentStatusBadge';
import NoShowRiskBadge from './components/NoShowRiskBadge';

const TRANSITIONS = {
  booked: ['confirmed', 'cancelled', 'no_show', 'rescheduled'],
  confirmed: ['checked_in', 'cancelled', 'no_show', 'rescheduled'],
  checked_in: ['in_consultation'],
  in_consultation: ['completed']
};

const DetailItem = ({ label, value }) => (
  <div className="rounded-2xl bg-stone-50 p-4">
    <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">{label}</dt>
    <dd className="mt-2 text-sm font-medium text-stone-900">{value || 'Not provided'}</dd>
  </div>
);

const AppointmentDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = getCurrentUserFromStorage();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleForm, setRescheduleForm] = useState({ appointmentDate: '', startTime: '', durationMinutes: 30, reason: '' });
  const [reminderMessage, setReminderMessage] = useState('');
  const [sendingReminder, setSendingReminder] = useState(false);

  const canManageAppointment = ['SUPER_ADMIN', 'ADMIN', 'RECEPTIONIST'].includes(currentUser?.role);
  const canUpdateStatus = canManageAppointment || currentUser?.role === 'DOCTOR';

  const loadAppointment = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await getAppointmentById(id);
      setAppointment(response.data.appointment);
      setSelectedStatus('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load appointment.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointment();
  }, [id]);

  const availableTransitions = useMemo(() => {
    const next = TRANSITIONS[appointment?.status] || [];

    if (currentUser?.role === 'DOCTOR') {
      return next.filter((status) => ['checked_in', 'in_consultation', 'completed'].includes(status));
    }

    return next.filter((status) => !['cancelled', 'rescheduled'].includes(status));
  }, [appointment?.status, currentUser?.role]);

  const handleStatusSubmit = async (event) => {
    event.preventDefault();

    if (!selectedStatus) {
      return;
    }

    try {
      await updateAppointmentStatus(id, { status: selectedStatus, note: statusNote || undefined });
      setStatusNote('');
      await loadAppointment();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update appointment status.');
    }
  };

  const handleCancel = async (event) => {
    event.preventDefault();

    if (!cancelReason.trim()) {
      setError('Cancellation reason is required.');
      return;
    }

    try {
      const response = await cancelAppointment(id, { cancellationReason: cancelReason.trim() });
      setAppointment(response.data.appointment);
      setCancelReason('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to cancel appointment.');
    }
  };

  const handleReschedule = async (event) => {
    event.preventDefault();

    if (!rescheduleForm.appointmentDate || !rescheduleForm.startTime || !rescheduleForm.reason.trim()) {
      setError('Reschedule date, time, and reason are required.');
      return;
    }

    try {
      const response = await rescheduleAppointment(id, { ...rescheduleForm, durationMinutes: Number(rescheduleForm.durationMinutes) });
      setRescheduleForm({ appointmentDate: '', startTime: '', durationMinutes: 30, reason: '' });
      navigate(`/appointments/${response.data.appointment._id}`, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to reschedule appointment.');
    }
  };

  const handleSendReminder = async () => {
    setSendingReminder(true);
    setReminderMessage('');
    setError('');

    try {
      await sendAppointmentReminder({ appointmentId: id });
      setReminderMessage('Appointment reminder queued successfully.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to send appointment reminder.');
    } finally {
      setSendingReminder(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading appointment details..." />;
  }

  if (error && !appointment) {
    return <ErrorState title="Appointment unavailable" description={error} />;
  }

  if (!appointment) {
    return <ErrorState title="Appointment unavailable" description="No appointment data was returned." />;
  }

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Appointment details</p>
          <h2 className="mt-2 text-3xl font-semibold text-stone-900">{appointment.patientId?.fullName || 'Patient not provided'}</h2>
          <p className="mt-2 text-sm text-stone-600">{appointment.appointmentDate?.slice?.(0, 10) || 'No date'} at {appointment.startTime || '--'}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <AppointmentStatusBadge status={appointment.status} />
          <AppointmentConsultationButton appointmentId={appointment._id} />
          <Link className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50" to="/appointments">
            Back to list
          </Link>
        </div>
      </div>

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
      {reminderMessage ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{reminderMessage}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="grid gap-6">
          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
            <h3 className="text-xl font-semibold text-stone-900">Appointment summary</h3>
            <dl className="mt-6 grid gap-4 md:grid-cols-2">
              <DetailItem label="Patient" value={appointment.patientId?.fullName} />
              <DetailItem label="Doctor" value={appointment.doctorId?.fullName} />
              <DetailItem label="Doctor code" value={appointment.doctorId?.doctorCode} />
              <DetailItem label="Specialization" value={appointment.doctorId?.specialization} />
              <DetailItem label="Date" value={appointment.appointmentDate?.slice?.(0, 10)} />
              <DetailItem label="Time" value={`${appointment.startTime || '--'} - ${appointment.endTime || '--'}`} />
              <DetailItem label="Type" value={appointment.appointmentType?.replaceAll('_', ' ')} />
              <DetailItem label="Source" value={appointment.source?.replaceAll('_', ' ')} />
              <DetailItem label="Reason for visit" value={appointment.reasonForVisit} />
              <DetailItem label="Symptoms summary" value={appointment.symptomsSummary} />
              <DetailItem label="Notes" value={appointment.notes} />
              <DetailItem label="Cancellation reason" value={appointment.cancellationReason} />
            </dl>
          </article>

          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
            <h3 className="text-xl font-semibold text-stone-900">Patient Medical History</h3>
            <dl className="mt-6 grid gap-4 md:grid-cols-2">
              <DetailItem label="Age" value={appointment.patientId?.age !== null && appointment.patientId?.age !== undefined ? `${appointment.patientId.age} years` : 'Not provided'} />
              <DetailItem label="Gender" value={appointment.patientId?.gender} />
              <DetailItem label="Blood Group" value={appointment.patientId?.bloodGroup} />
              <DetailItem label="Chronic Conditions / Past Medical Problems" value={appointment.patientId?.chronicConditions?.join?.(', ')} />
              <DetailItem label="Allergies" value={appointment.patientId?.allergies?.join?.(', ')} />
              <DetailItem label="Current Medications" value={appointment.patientId?.currentMedications?.join?.(', ')} />
            </dl>
          </article>
        </div>

        <aside className="grid gap-6">
          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
            <h3 className="text-lg font-semibold text-stone-900">No-show risk</h3>
            <div className="mt-4">
              <NoShowRiskBadge risk={appointment.noShowRisk} />
            </div>
          </article>

          {canUpdateStatus && availableTransitions.length ? (
            <form className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40" onSubmit={handleStatusSubmit}>
              <h3 className="text-lg font-semibold text-stone-900">Update status</h3>
              <select value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value)} className="rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
                <option value="">Select next status</option>
                {availableTransitions.map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
              <textarea value={statusNote} onChange={(event) => setStatusNote(event.target.value)} rows={3} placeholder="Optional note" className="rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              <button type="submit" className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700">
                Save status
              </button>
            </form>
          ) : null}

          {canManageAppointment ? (
            <>
              <article className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
                <h3 className="text-lg font-semibold text-stone-900">Send reminder</h3>
                <p className="text-sm text-stone-600">Queue an SMS/email reminder for this appointment.</p>
                <button
                  type="button"
                  onClick={handleSendReminder}
                  disabled={sendingReminder || ['cancelled', 'completed', 'no_show'].includes(appointment.status)}
                  className="rounded-2xl border border-sky-300 px-4 py-3 text-sm font-semibold text-sky-700 hover:bg-sky-50 disabled:opacity-60"
                >
                  {sendingReminder ? 'Sending reminder...' : 'Send appointment reminder'}
                </button>
              </article>

              <form className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40" onSubmit={handleCancel}>
                <h3 className="text-lg font-semibold text-stone-900">Cancel appointment</h3>
                <textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} rows={3} placeholder="Cancellation reason" className="rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                <button type="submit" className="rounded-2xl border border-rose-300 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50">
                  Cancel appointment
                </button>
              </form>

              <form className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40" onSubmit={handleReschedule}>
                <h3 className="text-lg font-semibold text-stone-900">Reschedule appointment</h3>
                <input type="date" value={rescheduleForm.appointmentDate} onChange={(event) => setRescheduleForm((current) => ({ ...current, appointmentDate: event.target.value }))} className="rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                <input type="time" value={rescheduleForm.startTime} onChange={(event) => setRescheduleForm((current) => ({ ...current, startTime: event.target.value }))} className="rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                <select value={rescheduleForm.durationMinutes} onChange={(event) => setRescheduleForm((current) => ({ ...current, durationMinutes: Number(event.target.value) }))} className="rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
                  {[15, 30, 45, 60].map((duration) => (
                    <option key={duration} value={duration}>
                      {duration} minutes
                    </option>
                  ))}
                </select>
                <textarea value={rescheduleForm.reason} onChange={(event) => setRescheduleForm((current) => ({ ...current, reason: event.target.value }))} rows={3} placeholder="Reason for reschedule" className="rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                <button type="submit" className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50">
                  Reschedule appointment
                </button>
              </form>
            </>
          ) : null}
        </aside>
      </div>
    </section>
  );
};

export default AppointmentDetailsPage;
