import { useEffect, useState } from 'react';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import Table from '../../components/common/Table';
import PageHeader from '../../components/layout/PageHeader';
import DateRangeFilter from './DateRangeFilter';
import { getDashboardAppointments, getDashboardNoShow } from './dashboardApi';
import NoDataState from './NoDataState';
import SectionCard from './SectionCard';
import StatCard from './StatCard';

const DashboardAppointmentsPage = () => {
  const [filters, setFilters] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [appointments, setAppointments] = useState(null);
  const [noShow, setNoShow] = useState(null);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');

    try {
      const [appointmentsResponse, noShowResponse] = await Promise.all([
        getDashboardAppointments(filters),
        getDashboardNoShow(filters)
      ]);

      setAppointments(appointmentsResponse.data || {});
      setNoShow(noShowResponse.data || {});
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load appointment analytics.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
    const interval = setInterval(() => {
      loadData(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [filters]);

  if (loading) {
    return <LoadingState label="Loading appointment analytics..." />;
  }

  if (error) {
    return <ErrorState title="Appointment analytics unavailable" description={error} />;
  }

  const cards = [
    { label: 'Total appointments', value: appointments?.total ?? 0 },
    { label: 'Booked', value: appointments?.booked ?? 0 },
    { label: 'Confirmed', value: appointments?.confirmed ?? 0 },
    { label: 'Completed', value: appointments?.completed ?? 0 },
    { label: 'Cancelled', value: appointments?.cancelled ?? 0 },
    { label: 'No-show', value: appointments?.noShow ?? 0 }
  ];

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Appointment analytics"
        description="Track appointment status mix, walk-ins, doctor-wise operational load, and no-show patterns for the selected range."
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <DateRangeFilter value={filters} onApply={setFilters} isLoading={loading} />
        <button
          onClick={() => loadData(true)}
          className="rounded-2xl border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 transition"
        >
          Refresh Analytics
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {cards.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SectionCard title="Daily appointment trend" description="Grouped appointment movement by appointment date.">
          <Table
            columns={[
              { key: 'date', label: 'Date' },
              { key: 'total', label: 'Total' },
              { key: 'completed', label: 'Completed' },
              { key: 'cancelled', label: 'Cancelled' },
              { key: 'noShow', label: 'No-show' }
            ]}
            rows={appointments?.byDay || []}
            emptyState={<NoDataState title="No appointment trend data" description="No appointments were found for this range." />}
          />
        </SectionCard>

        <SectionCard title="Doctor-wise appointment load" description="Use this to spot overloaded schedules and high no-show doctors.">
          <Table
            columns={[
              { key: 'doctorName', label: 'Doctor' },
              { key: 'total', label: 'Appointments' },
              { key: 'completed', label: 'Completed' },
              { key: 'noShow', label: 'No-show' }
            ]}
            rows={appointments?.byDoctor || []}
            emptyState={<NoDataState title="No doctor breakdown" description="Doctor-wise appointment metrics are not available for this range." />}
          />
        </SectionCard>
      </div>

      <SectionCard
        title="No-show summary"
        description={`No-show rate for the selected range: ${noShow?.noShowRate ?? 0}%`}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Total appointments" value={noShow?.totalAppointments ?? 0} />
          <StatCard label="No-show count" value={noShow?.noShowCount ?? 0} />
          <StatCard label="No-show rate" value={`${noShow?.noShowRate ?? 0}%`} />
        </div>
      </SectionCard>
    </section>
  );
};

export default DashboardAppointmentsPage;
