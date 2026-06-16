import { useEffect, useState } from 'react';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import Table from '../../components/common/Table';
import PageHeader from '../../components/layout/PageHeader';
import DateRangeFilter from './DateRangeFilter';
import { getDashboardNotifications } from './dashboardApi';
import NoDataState from './NoDataState';
import SectionCard from './SectionCard';
import StatCard from './StatCard';

const DashboardNotificationsPage = () => {
  const [filters, setFilters] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState(null);

  useEffect(() => {
    const loadNotifications = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await getDashboardNotifications(filters);
        setNotifications(response.data || {});
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load notification analytics.');
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [filters]);

  if (loading) {
    return <LoadingState label="Loading notification analytics..." />;
  }

  if (error) {
    return <ErrorState title="Notification analytics unavailable" description={error} />;
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Notifications and follow-ups"
        description="Review delivery volume, pending communication, and follow-up task progress in one place."
      />

      <DateRangeFilter value={filters} onApply={setFilters} isLoading={loading} />

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total notifications" value={notifications?.totalNotifications ?? 0} />
        <StatCard label="Sent" value={notifications?.sentNotifications ?? 0} />
        <StatCard label="Failed" value={notifications?.failedNotifications ?? 0} />
        <StatCard label="Pending" value={notifications?.pendingNotifications ?? 0} />
        <StatCard label="Pending follow-ups" value={notifications?.pendingFollowUps ?? 0} />
        <StatCard label="Completed follow-ups" value={notifications?.completedFollowUps ?? 0} />
      </div>

      {notifications?.notes?.length ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          {notifications.notes.join(' ')}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SectionCard title="By notification type" description="Tracks communication category volume in the selected range.">
          <Table
            columns={[
              { key: 'type', label: 'Type' },
              { key: 'count', label: 'Count' }
            ]}
            rows={notifications?.byType || []}
            emptyState={<NoDataState title="No notification types yet" description="Notification usage by type will appear here once staff start sending reminders." />}
          />
        </SectionCard>

        <SectionCard title="By channel" description="Shows which delivery channels were used in the selected range.">
          <Table
            columns={[
              { key: 'channel', label: 'Channel' },
              { key: 'count', label: 'Count' }
            ]}
            rows={notifications?.byChannel || []}
            emptyState={<NoDataState title="No channel data yet" description="Channel usage will appear once notifications are sent or scheduled." />}
          />
        </SectionCard>
      </div>
    </section>
  );
};

export default DashboardNotificationsPage;
