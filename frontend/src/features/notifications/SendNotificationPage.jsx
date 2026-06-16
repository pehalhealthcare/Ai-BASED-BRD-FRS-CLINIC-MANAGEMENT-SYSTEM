import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import PageHeader from '../../components/layout/PageHeader';
import { patientApi } from '../../lib/api';
import { sendNotification } from './notificationsApi';
import NotificationStatusBadge from './NotificationStatusBadge';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

const createInitialForm = () => ({
  patientId: '',
  type: 'custom',
  channel: 'mock',
  subject: '',
  body: '',
  scheduledFor: ''
});

const SendNotificationPage = () => {
  const [patients, setPatients] = useState([]);
  const [form, setForm] = useState(createInitialForm());
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadPatients = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await patientApi.list({ limit: 50 });

        if (isMounted) {
          setPatients(response.data.patients || []);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load patients for notification sending.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPatients();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setResult(null);

    try {
      const response = await sendNotification({
        patientId: form.patientId || undefined,
        type: form.type,
        channel: form.channel,
        subject: form.subject,
        body: form.body,
        scheduledFor: form.scheduledFor ? new Date(form.scheduledFor).toISOString() : null
      });

      setResult(response.data.notificationLog);
      setForm(createInitialForm());
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to process notification.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading notification form..." />;
  }

  if (error && !patients.length) {
    return <ErrorState title="Notification form unavailable" description={error} />;
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Phase 13"
        title="Send notification"
        description="Send a clinic-scoped patient update immediately or schedule it for later. MVP delivery is mock-first and safely auditable."
        actions={
          <>
            <Link className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50" to="/notifications/logs">
              View logs
            </Link>
          </>
        }
      />

      <div className="rounded-3xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
        Mock provider mode is active by default for local clinics. Messages are recorded with delivery metadata without requiring paid SMS, WhatsApp, or email credentials.
      </div>

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <form className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-medium text-stone-700">
            <span>Patient</span>
            <select className={FIELD_CLASS} value={form.patientId} onChange={(event) => setForm((current) => ({ ...current, patientId: event.target.value }))}>
              <option value="">Select patient</option>
              {patients.map((patient) => (
                <option key={patient._id} value={patient._id}>
                  {patient.fullName || patient.patientId || patient._id}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Type</span>
              <select className={FIELD_CLASS} value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>
                <option value="custom">Custom</option>
                <option value="appointment_reminder">Appointment reminder</option>
                <option value="follow_up">Follow-up</option>
                <option value="prescription_ready">Prescription ready</option>
                <option value="billing_due">Billing due</option>
                <option value="lab_report_ready">Lab report ready</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Channel</span>
              <select className={FIELD_CLASS} value={form.channel} onChange={(event) => setForm((current) => ({ ...current, channel: event.target.value }))}>
                <option value="mock">Mock</option>
                <option value="email">Email placeholder</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="in_app">In-app</option>
              </select>
            </label>
          </div>

          <label className="grid gap-2 text-sm font-medium text-stone-700">
            <span>Subject</span>
            <input className={FIELD_CLASS} value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} placeholder="Custom update" />
          </label>

          <label className="grid gap-2 text-sm font-medium text-stone-700">
            <span>Message body</span>
            <textarea
              className={FIELD_CLASS}
              rows={7}
              value={form.body}
              onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
              placeholder="Please contact the clinic."
              required
            />
          </label>

          <label className="grid gap-2 text-sm font-medium text-stone-700">
            <span>Schedule for</span>
            <input className={FIELD_CLASS} type="datetime-local" value={form.scheduledFor} onChange={(event) => setForm((current) => ({ ...current, scheduledFor: event.target.value }))} />
          </label>

          <button
            type="submit"
            disabled={saving}
            className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-stone-300"
          >
            {saving ? 'Processing...' : 'Send or schedule notification'}
          </button>
        </form>

        <aside className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">Delivery notes</h2>
            <p className="mt-2 text-sm text-stone-600">Missing patient contact fields do not crash the flow. The system stores the notification log and rendered body even when only a patient name is available.</p>
          </div>

          {result ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-lg font-semibold text-emerald-900">Notification processed</h3>
                <NotificationStatusBadge status={result.status} />
              </div>
              <p className="mt-3 text-sm text-emerald-800">Subject: {result.subject || 'No subject'}</p>
              <p className="mt-2 text-sm text-emerald-800">{result.body || 'No message body recorded.'}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.16em] text-emerald-700">
                Scheduled {(result.scheduledFor || '').slice?.(0, 16).replace('T', ' ') || 'Immediately'}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
              Processed notifications will appear here after submission so staff can confirm whether the entry was sent immediately or stored as pending.
            </div>
          )}
        </aside>
      </div>
    </section>
  );
};

export default SendNotificationPage;
