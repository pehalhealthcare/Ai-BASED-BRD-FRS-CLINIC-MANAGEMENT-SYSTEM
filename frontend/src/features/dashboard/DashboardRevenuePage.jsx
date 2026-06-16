import { useEffect, useState } from 'react';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import Table from '../../components/common/Table';
import PageHeader from '../../components/layout/PageHeader';
import { formatCurrency } from '../../utils/formatCurrency';
import DateRangeFilter from './DateRangeFilter';
import { getDashboardRevenue } from './dashboardApi';
import NoDataState from './NoDataState';
import SectionCard from './SectionCard';
import StatCard from './StatCard';

const DashboardRevenuePage = () => {
  const [filters, setFilters] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revenue, setRevenue] = useState(null);

  useEffect(() => {
    const loadRevenue = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await getDashboardRevenue(filters);
        setRevenue(response.data || {});
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Unable to load revenue analytics.');
      } finally {
        setLoading(false);
      }
    };

    loadRevenue();
  }, [filters]);

  if (loading) {
    return <LoadingState label="Loading revenue analytics..." />;
  }

  if (error) {
    return <ErrorState title="Revenue analytics unavailable" description={error} />;
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Revenue summary"
        description="Best-effort clinic revenue from billing invoices and pharmacy sales, with outstanding amounts shown separately."
      />

      <DateRangeFilter value={filters} onApply={setFilters} isLoading={loading} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Invoice revenue" value={formatCurrency(revenue?.invoiceRevenue || 0)} />
        <StatCard label="Pharmacy revenue" value={formatCurrency(revenue?.pharmacyRevenue || 0)} />
        <StatCard label="Total revenue" value={formatCurrency(revenue?.totalRevenue || 0)} />
        <StatCard label="Paid amount" value={formatCurrency(revenue?.paidAmount || 0)} />
        <StatCard label="Outstanding" value={formatCurrency(revenue?.unpaidAmount || 0)} />
      </div>

      <SectionCard title="Revenue by day" description="Invoice and pharmacy revenue merged by date for the selected range.">
        <Table
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'invoiceRevenue', label: 'Invoice revenue', render: (row) => formatCurrency(row.invoiceRevenue || 0) },
            { key: 'pharmacyRevenue', label: 'Pharmacy revenue', render: (row) => formatCurrency(row.pharmacyRevenue || 0) },
            { key: 'totalRevenue', label: 'Total revenue', render: (row) => formatCurrency(row.totalRevenue || 0) }
          ]}
          rows={revenue?.byDay || []}
          emptyState={<NoDataState title="No revenue data" description="There were no invoice or pharmacy revenue records in this range." />}
        />
      </SectionCard>
    </section>
  );
};

export default DashboardRevenuePage;
