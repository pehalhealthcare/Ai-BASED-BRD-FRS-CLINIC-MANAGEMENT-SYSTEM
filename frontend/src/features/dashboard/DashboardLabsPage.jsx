import { useEffect, useState } from 'react';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import Table from '../../components/common/Table';
import PageHeader from '../../components/layout/PageHeader';
import DateRangeFilter from './DateRangeFilter';
import { getDashboardLabs } from './dashboardApi';
import NoDataState from './NoDataState';
import SectionCard from './SectionCard';
import StatCard from './StatCard';

const DashboardLabsPage = () => {
  const [filters, setFilters] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [labs, setLabs] = useState(null);

  useEffect(() => {
    const loadLabs = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await getDashboardLabs(filters);
        setLabs(response.data || {});
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load lab analytics.');
      } finally {
        setLoading(false);
      }
    };

    loadLabs();
  }, [filters]);

  if (loading) {
    return <LoadingState label="Loading lab analytics..." />;
  }

  if (error) {
    return <ErrorState title="Lab analytics unavailable" description={error} />;
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Lab analytics"
        description="Monitor order throughput, completion, and abnormal report activity without leaving the main clinic dashboard."
      />

      <DateRangeFilter value={filters} onApply={setFilters} isLoading={loading} />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total orders" value={labs?.totalOrders ?? 0} />
        <StatCard label="Completed orders" value={labs?.completedOrders ?? 0} />
        <StatCard label="Pending orders" value={labs?.pendingOrders ?? 0} />
        <StatCard label="Abnormal reports" value={labs?.abnormalReports ?? 0} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <SectionCard title="Status breakdown" description="Current lab order mix in the selected range.">
          <Table
            columns={[
              { key: 'status', label: 'Status' },
              { key: 'count', label: 'Count' }
            ]}
            rows={labs?.byStatus || []}
            emptyState={<NoDataState title="No lab status data" description="No lab orders were found for this range." />}
          />
        </SectionCard>

        <SectionCard title="Daily lab throughput" description="Orders and completed orders grouped by ordered date.">
          <Table
            columns={[
              { key: 'date', label: 'Date' },
              { key: 'totalOrders', label: 'Total orders' },
              { key: 'completedOrders', label: 'Completed orders' }
            ]}
            rows={labs?.byDay || []}
            emptyState={<NoDataState title="No lab trend data" description="Lab activity will appear here once orders are created." />}
          />
        </SectionCard>
      </div>
    </section>
  );
};

export default DashboardLabsPage;
