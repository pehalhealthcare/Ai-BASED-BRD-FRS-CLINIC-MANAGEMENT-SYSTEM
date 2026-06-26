import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import PageHeader from '../../components/layout/PageHeader';
import { ADMIN_ROLES } from '../../constants/roles';
import useAuth from '../../hooks/useAuth';
import {
  cancelNotificationLog,
  dispatchPendingNotifications,
  listNotificationLogs
} from './notificationsApi';
import ChannelBadge from './ChannelBadge';
import NotificationStatusBadge from './NotificationStatusBadge';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-white';

const NotificationLogsPage = () => {
  const { user } = useAuth();
  const canDispatchPending = ADMIN_ROLES.includes(user?.role);
  const [filters, setFilters] = useState({
    patientId: '',
    type: '',
    status: '',
    channel: '',
    from: '',
    to: ''
  });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionState, setActionState] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await listNotificationLogs({
        limit: 30,
        ...(filters.patientId ? { patientId: filters.patientId } : {}),
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.channel ? { channel: filters.channel } : {}),
        ...(filters.from ? { from: filters.from } : {}),
        ...(filters.to ? { to: filters.to } : {})
      });

      setLogs(response.data.notificationLogs || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load notification logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [filters.channel, filters.from, filters.patientId, filters.status, filters.to, filters.type]);

  const handleCancel = async (id) => {
    setActionState(id);
    setError('');

    try {
      await cancelNotificationLog(id);
      await loadLogs();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to cancel notification.');
    } finally {
      setActionState('');
    }
  };

  const handleDispatchPending = async () => {
    setActionState('dispatch');
    setError('');

    try {
      await dispatchPendingNotifications();
      await loadLogs();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to dispatch pending notifications.');
    } finally {
      setActionState('');
    }
  };

  if (loading) {
    return <LoadingState label="Loading notification logs..." />;
  }

  if (error && !logs.length) {
    return <ErrorState title="Notification logs unavailable" description={error} />;
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Phase 13"
        title="Notification logs"
        description="Review sent, pending, failed, and cancelled patient communication across appointments, labs, billing, and follow-ups."
        actions={
          <>
            <Link className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50" to="/notifications/templates">
              Templates
            </Link>
            <Link className="rounded-2xl border border-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50" to="/notifications/send">
              Send notification
            </Link>
            {canDispatchPending ? (
              <button
                type="button"
                onClick={handleDispatchPending}
                disabled={actionState === 'dispatch'}
                className="rounded-2xl bg-stone-900 px-4 py-3 text-sm font-semibold text-white hover:bg-stone-800 disabled:bg-stone-300"
              >
                {actionState === 'dispatch' ? 'Dispatching...' : 'Dispatch pending'}
              </button>
            ) : null}
          </>
        }
      />

      <div className="rounded-3xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
        Mock mode is the default MVP transport. Sent entries are stored and auditable even when no external SMS, WhatsApp, or email provider is configured.
      </div>

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <div className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 md:grid-cols-3 xl:grid-cols-6">
        <label className="grid gap-2 text-sm font-medium text-stone-700">
          <span>Patient ID</span>
          <input className={FIELD_CLASS} value={filters.patientId} onChange={(event) => setFilters((current) => ({ ...current, patientId: event.target.value }))} placeholder="ObjectId" />
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
          <span>Status</span>
          <select className={FIELD_CLASS} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-stone-700">
          <span>Channel</span>
          <select className={FIELD_CLASS} value={filters.channel} onChange={(event) => setFilters((current) => ({ ...current, channel: event.target.value }))}>
            <option value="">All channels</option>
            <option value="mock">Mock</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="in_app">In-app</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-stone-700">
          <span>From</span>
          <input className={FIELD_CLASS} type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-stone-700">
          <span>To</span>
          <input className={FIELD_CLASS} type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} />
        </label>
      </div>

      {!logs.length ? (
        <EmptyState title="No notification logs found" description="Scheduled and sent reminders will appear here once staff start using the notification module." />
      ) : (
        <div className="grid gap-4">
          {logs.map((log) => (
            <article key={log._id} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/40">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-semibold text-stone-900">{log.subject || 'Notification log'}</h2>
                    <NotificationStatusBadge status={log.status} />
                    <ChannelBadge channel={log.channel} />
                  </div>
                  <p className="mt-2 text-sm text-stone-600">
                    Type: {log.type?.replaceAll('_', ' ') || 'Not provided'} | Recipient: {log.recipient?.name || 'Unknown'}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    Contact: {log.recipient?.phone || log.recipient?.email || 'No phone or email on file'}
                  </p>
                  <p className="mt-3 text-sm text-stone-700">{log.body || 'No message body recorded.'}</p>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs uppercase tracking-[0.16em] text-stone-500">
                    <span>Created {(log.createdAt || '').slice?.(0, 10) || 'N/A'}</span>
                    <span>Scheduled {(log.scheduledFor || '').slice?.(0, 16).replace('T', ' ') || 'Immediate'}</span>
                    <span>Sent {(log.sentAt || '').slice?.(0, 16).replace('T', ' ') || 'Not yet'}</span>
                  </div>
                </div>
                {log.status === 'pending' ? (
                  <button
                    type="button"
                    onClick={() => handleCancel(log._id)}
                    disabled={actionState === log._id}
                    className="rounded-2xl border border-rose-300 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:border-stone-200 disabled:text-stone-400"
                  >
                    {actionState === log._id ? 'Cancelling...' : 'Cancel pending'}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default NotificationLogsPage;
