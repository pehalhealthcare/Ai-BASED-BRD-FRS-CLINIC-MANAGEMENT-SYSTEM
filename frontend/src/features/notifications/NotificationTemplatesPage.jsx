import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import PageHeader from '../../components/layout/PageHeader';
import { ADMIN_ROLES } from '../../constants/roles';
import useAuth from '../../hooks/useAuth';
import { createNotificationTemplate, listNotificationTemplates } from './notificationsApi';
import ChannelBadge from './ChannelBadge';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

const createInitialForm = () => ({
  name: '',
  type: 'appointment_reminder',
  channel: 'mock',
  subject: '',
  body: '',
  variables: ''
});

const NotificationTemplatesPage = () => {
  const { user } = useAuth();
  const canManageTemplates = ADMIN_ROLES.includes(user?.role);
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    channel: '',
    isActive: 'true'
  });
  const [form, setForm] = useState(createInitialForm());
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadTemplates = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await listNotificationTemplates({
        limit: 50,
        ...(filters.search ? { search: filters.search } : {}),
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.channel ? { channel: filters.channel } : {}),
        ...(filters.isActive !== 'all' ? { isActive: filters.isActive === 'true' } : {})
      });

      setTemplates(response.data.notificationTemplates || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load notification templates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [filters.channel, filters.isActive, filters.search, filters.type]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      await createNotificationTemplate({
        name: form.name,
        type: form.type,
        channel: form.channel,
        subject: form.subject,
        body: form.body,
        variables: form.variables
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
      });
      setForm(createInitialForm());
      await loadTemplates();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create notification template.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading notification templates..." />;
  }

  if (error && !templates.length && !canManageTemplates) {
    return <ErrorState title="Templates unavailable" description={error} />;
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Phase 13"
        title="Notification templates"
        description="Manage reusable mock-first templates for reminders, ready alerts, and follow-up communication."
        actions={
          <>
            <Link className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50" to="/notifications/logs">
              View logs
            </Link>
            <Link className="rounded-2xl border border-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50" to="/notifications/send">
              Send notification
            </Link>
          </>
        }
      />

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        {canManageTemplates ? (
          <form className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40" onSubmit={handleCreate}>
            <div>
              <h2 className="text-xl font-semibold text-stone-900">Create template</h2>
              <p className="mt-2 text-sm text-stone-600">Templates stay clinic-scoped and support safe variable replacement without any external provider setup.</p>
            </div>

            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Name</span>
              <input className={FIELD_CLASS} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-stone-700">
                <span>Type</span>
                <select className={FIELD_CLASS} value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>
                  <option value="appointment_reminder">Appointment reminder</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="prescription_ready">Prescription ready</option>
                  <option value="billing_due">Billing due</option>
                  <option value="lab_report_ready">Lab report ready</option>
                  <option value="custom">Custom</option>
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
              <input className={FIELD_CLASS} value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} placeholder="Appointment Reminder" />
            </label>

            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Body</span>
              <textarea
                className={FIELD_CLASS}
                rows={6}
                value={form.body}
                onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                placeholder="Hello {{patientName}}, your appointment is on {{appointmentDate}} at {{appointmentTime}}."
                required
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Variables</span>
              <input
                className={FIELD_CLASS}
                value={form.variables}
                onChange={(event) => setForm((current) => ({ ...current, variables: event.target.value }))}
                placeholder="patientName, appointmentDate, appointmentTime"
              />
            </label>

            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-stone-300"
            >
              {saving ? 'Saving...' : 'Create template'}
            </button>
          </form>
        ) : null}

        <div className="grid gap-4">
          <div className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 md:grid-cols-4">
            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Search</span>
              <input className={FIELD_CLASS} value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Reminder" />
            </label>
            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Type</span>
              <select className={FIELD_CLASS} value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}>
                <option value="">All types</option>
                <option value="appointment_reminder">Appointment reminder</option>
                <option value="follow_up">Follow-up</option>
                <option value="prescription_ready">Prescription ready</option>
                <option value="billing_due">Billing due</option>
                <option value="lab_report_ready">Lab report ready</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Channel</span>
              <select className={FIELD_CLASS} value={filters.channel} onChange={(event) => setFilters((current) => ({ ...current, channel: event.target.value }))}>
                <option value="">All channels</option>
                <option value="mock">Mock</option>
                <option value="email">Email placeholder</option>
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="in_app">In-app</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Status</span>
              <select className={FIELD_CLASS} value={filters.isActive} onChange={(event) => setFilters((current) => ({ ...current, isActive: event.target.value }))}>
                <option value="true">Active only</option>
                <option value="false">Inactive only</option>
                <option value="all">All</option>
              </select>
            </label>
          </div>

          {!templates.length ? (
            <EmptyState title="No templates found" description="Create a clinic template first so staff can send reminders consistently." />
          ) : (
            <div className="grid gap-4">
              {templates.map((template) => (
                <article key={template._id} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/40">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-semibold text-stone-900">{template.name}</h2>
                        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">{template.type.replaceAll('_', ' ')}</span>
                        <ChannelBadge channel={template.channel} />
                      </div>
                      <p className="mt-2 text-sm text-stone-600">Subject: {template.subject || 'No subject'}</p>
                      <p className="mt-2 text-sm text-stone-600">{template.body}</p>
                      <p className="mt-3 text-xs uppercase tracking-[0.16em] text-stone-500">
                        Variables: {template.variables?.length ? template.variables.join(', ') : 'None'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.16em] text-stone-500">
                        {template.isActive ? 'Active' : 'Inactive'}
                      </p>
                      <p className="mt-2 text-sm text-stone-600">Updated {(template.updatedAt || template.createdAt || '').slice?.(0, 10) || 'Recently'}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default NotificationTemplatesPage;
