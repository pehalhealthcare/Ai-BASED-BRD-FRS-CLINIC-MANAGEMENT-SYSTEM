import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import PageHeader from '../../components/layout/PageHeader';
import { getPatientNotificationHistory } from './notificationsApi';
import ChannelBadge from './ChannelBadge';
import FollowUpStatusBadge from './FollowUpStatusBadge';
import NotificationStatusBadge from './NotificationStatusBadge';

const PatientNotificationHistory = () => {
  const { patientId } = useParams();
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadHistory = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await getPatientNotificationHistory(patientId, { limit: 25 });

        if (isMounted) {
          setHistory(response.data);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load patient notification history.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [patientId]);

  if (loading) {
    return <LoadingState label="Loading patient notification history..." />;
  }

  if (error || !history) {
    return <ErrorState title="Notification history unavailable" description={error || 'No patient notification history found.'} />;
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Phase 13"
        title={`${history.patient?.fullName || 'Patient'} notifications`}
        description="Review the patient-specific communication trail and follow-up work without leaving the clinical record."
        actions={
          <>
            <Link className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50" to={`/patients/${patientId}`}>
              Back to patient
            </Link>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Notification logs</p>
          <p className="mt-3 text-3xl font-semibold text-stone-900">{history.pagination?.total ?? history.notificationLogs?.length ?? 0}</p>
        </div>
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Follow-up tasks</p>
          <p className="mt-3 text-3xl font-semibold text-stone-900">{history.followUpTasks?.length ?? 0}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="grid gap-4">
          <h2 className="text-xl font-semibold text-stone-900">Notification trail</h2>
          {!history.notificationLogs?.length ? (
            <EmptyState title="No notifications recorded" description="Appointment reminders, follow-up messages, and ready alerts will appear here for this patient." />
          ) : (
            history.notificationLogs.map((log) => (
              <article key={log._id} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/40">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-semibold text-stone-900">{log.subject || 'Notification log'}</h3>
                  <NotificationStatusBadge status={log.status} />
                  <ChannelBadge channel={log.channel} />
                </div>
                <p className="mt-2 text-sm text-stone-600">
                  Type: {log.type?.replaceAll('_', ' ') || 'Not provided'} | Scheduled {(log.scheduledFor || '').slice?.(0, 16).replace('T', ' ') || 'Immediate'}
                </p>
                <p className="mt-3 text-sm text-stone-700">{log.body || 'No message body recorded.'}</p>
              </article>
            ))
          )}
        </div>

        <div className="grid gap-4">
          <h2 className="text-xl font-semibold text-stone-900">Follow-up tasks</h2>
          {!history.followUpTasks?.length ? (
            <EmptyState title="No follow-up tasks found" description="Doctor-created follow-up tasks will appear here once they are scheduled for this patient." />
          ) : (
            history.followUpTasks.map((task) => (
              <article key={task._id} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/40">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-semibold text-stone-900">{task.title}</h3>
                  <FollowUpStatusBadge status={task.status} />
                </div>
                <p className="mt-2 text-sm text-stone-600">
                  Due {(task.dueDate || '').slice?.(0, 10) || 'Not provided'} | Reminder sent {task.reminderSent ? 'Yes' : 'No'}
                </p>
                <p className="mt-3 text-sm text-stone-700">{task.description || 'No description provided.'}</p>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default PatientNotificationHistory;
