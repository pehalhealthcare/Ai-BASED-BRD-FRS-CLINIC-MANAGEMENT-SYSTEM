import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import PageHeader from '../../components/layout/PageHeader';
import { ADMIN_ROLES, ROLES } from '../../constants/roles';
import useAuth from '../../hooks/useAuth';
import { patientApi } from '../../lib/api';
import {
  createFollowUpTask,
  listFollowUpTasks,
  updateFollowUpTaskStatus
} from './notificationsApi';
import FollowUpStatusBadge from './FollowUpStatusBadge';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-white';

const createInitialForm = () => ({
  patientId: '',
  title: '',
  description: '',
  dueDate: '',
  type: 'follow_up_visit',
  channel: 'mock'
});

const FollowUpTasksPage = () => {
  const { user } = useAuth();
  const canCreate = ADMIN_ROLES.includes(user?.role) || user?.role === ROLES.DOCTOR;
  const canUpdate = ADMIN_ROLES.includes(user?.role) || user?.role === ROLES.DOCTOR;
  const [patients, setPatients] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    dueFrom: '',
    dueTo: ''
  });
  const [form, setForm] = useState(createInitialForm());
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [actionState, setActionState] = useState('');

  const loadTasks = async () => {
    try {
      const response = await listFollowUpTasks({
        limit: 30,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.dueFrom ? { dueFrom: filters.dueFrom } : {}),
        ...(filters.dueTo ? { dueTo: filters.dueTo } : {})
      });

      setTasks(response.data.followUpTasks || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load follow-up tasks.');
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadPage = async () => {
      setLoading(true);
      setError('');

      try {
        const [patientsResponse, tasksResponse] = await Promise.all([
          patientApi.list({ limit: 50 }),
          listFollowUpTasks({
            limit: 30,
            ...(filters.status ? { status: filters.status } : {}),
            ...(filters.dueFrom ? { dueFrom: filters.dueFrom } : {}),
            ...(filters.dueTo ? { dueTo: filters.dueTo } : {})
          })
        ]);

        if (isMounted) {
          setPatients(patientsResponse.data.patients || []);
          setTasks(tasksResponse.data.followUpTasks || []);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load follow-up workspace.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPage();

    return () => {
      isMounted = false;
    };
  }, [filters.dueFrom, filters.dueTo, filters.status]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      await createFollowUpTask({
        patientId: form.patientId,
        title: form.title,
        description: form.description,
        dueDate: form.dueDate,
        type: form.type,
        channel: form.channel
      });
      setForm(createInitialForm());
      await loadTasks();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create follow-up task.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusUpdate = async (taskId, status) => {
    setActionState(taskId);
    setError('');

    try {
      await updateFollowUpTaskStatus(taskId, { status });
      await loadTasks();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update follow-up task status.');
    } finally {
      setActionState('');
    }
  };

  if (loading) {
    return <LoadingState label="Loading follow-up tasks..." />;
  }

  if (error && !tasks.length && !patients.length) {
    return <ErrorState title="Follow-up workspace unavailable" description={error} />;
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Phase 13"
        title="Follow-up tasks"
        description="Create reminder-backed follow-up work for doctors and clinic staff without needing a background worker or external messaging service."
        actions={
          <>
            <Link className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50" to="/notifications/logs">
              Notification logs
            </Link>
          </>
        }
      />

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <div className={`grid gap-6 ${canCreate ? 'xl:grid-cols-[0.9fr_1.1fr]' : ''}`}>
        {canCreate ? (
          <form className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40" onSubmit={handleCreate}>
            <div>
              <h2 className="text-xl font-semibold text-stone-900">Create follow-up task</h2>
              <p className="mt-2 text-sm text-stone-600">Each task can also create a scheduled notification entry so staff have a clear delivery trail.</p>
            </div>

            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Patient</span>
              <select className={FIELD_CLASS} value={form.patientId} onChange={(event) => setForm((current) => ({ ...current, patientId: event.target.value }))} required>
                <option value="">Select patient</option>
                {patients.map((patient) => (
                  <option key={patient._id} value={patient._id}>
                    {patient.fullName || patient.patientId || patient._id}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Title</span>
              <input className={FIELD_CLASS} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Review after 7 days" required />
            </label>

            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Description</span>
              <textarea className={FIELD_CLASS} rows={4} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Follow up for fever improvement" />
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="grid gap-2 text-sm font-medium text-stone-700">
                <span>Due date</span>
                <input className={FIELD_CLASS} type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} required />
              </label>
              <label className="grid gap-2 text-sm font-medium text-stone-700">
                <span>Type</span>
                <select className={FIELD_CLASS} value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>
                  <option value="follow_up_visit">Follow-up visit</option>
                  <option value="lab_review">Lab review</option>
                  <option value="medication_review">Medication review</option>
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

            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-stone-300"
            >
              {saving ? 'Saving...' : 'Create follow-up'}
            </button>
          </form>
        ) : null}

        <div className="grid gap-4">
          <div className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Status</span>
              <select className={FIELD_CLASS} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Due from</span>
              <input className={FIELD_CLASS} type="date" value={filters.dueFrom} onChange={(event) => setFilters((current) => ({ ...current, dueFrom: event.target.value }))} />
            </label>
            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Due to</span>
              <input className={FIELD_CLASS} type="date" value={filters.dueTo} onChange={(event) => setFilters((current) => ({ ...current, dueTo: event.target.value }))} />
            </label>
          </div>

          {!tasks.length ? (
            <EmptyState title="No follow-up tasks found" description="Tasks will appear here after doctors or admins create follow-up work for patients." />
          ) : (
            <div className="grid gap-4">
              {tasks.map((task) => (
                <article key={task._id} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/40">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-semibold text-stone-900">{task.title}</h2>
                        <FollowUpStatusBadge status={task.status} />
                      </div>
                      <p className="mt-2 text-sm text-stone-600">
                        Patient: {task.patientId?.fullName || 'Not provided'} | Due {(task.dueDate || '').slice?.(0, 10) || 'Not provided'}
                      </p>
                      <p className="mt-1 text-sm text-stone-600">
                        Type: {task.type?.replaceAll('_', ' ') || 'Not provided'} | Reminder sent: {task.reminderSent ? 'Yes' : 'No'}
                      </p>
                      <p className="mt-3 text-sm text-stone-700">{task.description || 'No description provided.'}</p>
                    </div>
                    {canUpdate && task.status === 'pending' ? (
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(task._id, 'completed')}
                          disabled={actionState === task._id}
                          className="rounded-2xl border border-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:border-stone-200 disabled:text-stone-400"
                        >
                          {actionState === task._id ? 'Updating...' : 'Mark completed'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(task._id, 'cancelled')}
                          disabled={actionState === task._id}
                          className="rounded-2xl border border-rose-300 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:border-stone-200 disabled:text-stone-400"
                        >
                          {actionState === task._id ? 'Updating...' : 'Cancel'}
                        </button>
                      </div>
                    ) : null}
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

export default FollowUpTasksPage;
