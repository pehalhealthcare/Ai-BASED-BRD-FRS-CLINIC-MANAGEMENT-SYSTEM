import { useEffect, useState } from 'react';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import Table from '../../components/common/Table';
import PageHeader from '../../components/layout/PageHeader';
import DateRangeFilter from './DateRangeFilter';
import { getDashboardPatients } from './dashboardApi';
import NoDataState from './NoDataState';
import SectionCard from './SectionCard';
import StatCard from './StatCard';

const DashboardPatientsPage = () => {
  const [filters, setFilters] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [patients, setPatients] = useState(null);

  useEffect(() => {
    const loadPatients = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await getDashboardPatients(filters);
        setPatients(response.data || {});
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load patient analytics.');
      } finally {
        setLoading(false);
      }
    };

    loadPatients();
  }, [filters]);

  if (loading) {
    return <LoadingState label="Loading patient analytics..." />;
  }

  if (error) {
    return <ErrorState title="Patient analytics unavailable" description={error} />;
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Patient analytics"
        description="Track total patient count, new registrations, active patients, and the current gender mix."
      />

      <DateRangeFilter value={filters} onApply={setFilters} isLoading={loading} />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total patients" value={patients?.totalPatients ?? 0} />
        <StatCard label="New patients" value={patients?.newPatients ?? 0} />
        <StatCard label="Active patients" value={patients?.activePatients ?? 0} hint="Distinct patients with clinic activity in range." />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <SectionCard title="Gender mix" description="Current patient registry grouped by recorded gender.">
          <Table
            columns={[
              { key: 'gender', label: 'Gender' },
              { key: 'count', label: 'Count' }
            ]}
            rows={patients?.byGender || []}
            emptyState={<NoDataState title="No patient profile mix" description="No gender distribution is available yet." />}
          />
        </SectionCard>

        <SectionCard title="New patient trend" description="Daily patient registration growth inside the selected range.">
          <Table
            columns={[
              { key: 'date', label: 'Date' },
              { key: 'newPatients', label: 'New patients' }
            ]}
            rows={patients?.byDay || []}
            emptyState={<NoDataState title="No patient growth data" description="No new patients were created in this range." />}
          />
        </SectionCard>
      </div>
    </section>
  );
};

export default DashboardPatientsPage;
