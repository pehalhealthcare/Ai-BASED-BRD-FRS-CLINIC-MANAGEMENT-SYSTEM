import { useEffect, useState } from 'react';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import Table from '../../components/common/Table';
import PageHeader from '../../components/layout/PageHeader';
import { formatCurrency } from '../../utils/formatCurrency';
import DateRangeFilter from './DateRangeFilter';
import { getDashboardPharmacy } from './dashboardApi';
import NoDataState from './NoDataState';
import SectionCard from './SectionCard';
import StatCard from './StatCard';

const DashboardPharmacyPage = () => {
  const [filters, setFilters] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pharmacy, setPharmacy] = useState(null);

  useEffect(() => {
    const loadPharmacy = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await getDashboardPharmacy(filters);
        setPharmacy(response.data || {});
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load pharmacy analytics.');
      } finally {
        setLoading(false);
      }
    };

    loadPharmacy();
  }, [filters]);

  if (loading) {
    return <LoadingState label="Loading pharmacy analytics..." />;
  }

  if (error) {
    return <ErrorState title="Pharmacy analytics unavailable" description={error} />;
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Pharmacy analytics"
        description="Track current inventory risk plus dispensing and sale totals for the selected date range."
      />

      <DateRangeFilter value={filters} onApply={setFilters} isLoading={loading} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total medicines" value={pharmacy?.totalMedicines ?? 0} />
        <StatCard label="Low stock" value={pharmacy?.lowStockMedicines ?? 0} />
        <StatCard label="Near expiry" value={pharmacy?.nearExpiryMedicines ?? 0} />
        <StatCard label="Dispensings" value={pharmacy?.totalDispensings ?? 0} />
        <StatCard label="Pharmacy sales" value={formatCurrency(pharmacy?.totalPharmacySales || 0)} />
      </div>

      <SectionCard title="Medicine categories" description="Current active medicines grouped by category for this clinic.">
        <Table
          columns={[
            { key: 'category', label: 'Category' },
            { key: 'count', label: 'Count' }
          ]}
          rows={pharmacy?.byCategory || []}
          emptyState={<NoDataState title="No pharmacy categories" description="Medicine category analytics will appear after catalog records are created." />}
        />
      </SectionCard>
    </section>
  );
};

export default DashboardPharmacyPage;
