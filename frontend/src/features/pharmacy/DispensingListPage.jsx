import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import PageHeader from '../../components/layout/PageHeader';
import { listDispensings } from './pharmacyApi';
import DispensingStatusBadge from './DispensingStatusBadge';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

const DispensingListPage = () => {
  const [filters, setFilters] = useState({
    status: '',
    from: '',
    to: ''
  });
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadRecords = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await listDispensings({
          limit: 20,
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.from ? { from: filters.from } : {}),
          ...(filters.to ? { to: filters.to } : {})
        });

        if (isMounted) {
          setRecords(response.data.dispensingRecords || []);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load dispensing records.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadRecords();

    return () => {
      isMounted = false;
    };
  }, [filters.from, filters.status, filters.to]);

  if (loading) {
    return <LoadingState label="Loading dispensing records..." />;
  }

  if (error && !records.length) {
    return <ErrorState title="Dispensing records unavailable" description={error} />;
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Phase 12"
        title="Dispensing records"
        description="Track medicines already dispensed against finalized prescriptions and review linked pharmacy sales."
        actions={
          <>
            <Link className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50" to="/pharmacy/medicines">
              Back to catalog
            </Link>
          </>
        }
      />

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <div className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium text-stone-700">
          <span>Status</span>
          <select className={FIELD_CLASS} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="dispensed">Dispensed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-stone-700">
          <span>From date</span>
          <input className={FIELD_CLASS} type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-stone-700">
          <span>To date</span>
          <input className={FIELD_CLASS} type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} />
        </label>
      </div>

      {!records.length ? (
        <EmptyState title="No dispensing records found" description="Dispensed prescriptions will appear here once pharmacy staff issue medicines." />
      ) : (
        <div className="grid gap-4">
          {records.map((record) => (
            <article key={record._id} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/40">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-semibold text-stone-900">
                      {record.prescriptionId?.prescriptionNumber || 'Dispensing record'}
                    </h2>
                    <DispensingStatusBadge status={record.status} />
                  </div>
                  <p className="mt-2 text-sm text-stone-600">
                    Patient: {record.patientId?.fullName || 'Not provided'} | Dispensed on {(record.dispensedAt || '').slice?.(0, 10) || 'Not provided'}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    Medicines: {(record.items || []).map((item) => item.medicineName).join(', ') || 'Not provided'}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    Sale: INR {Number(record.pharmacySale?.amount || record.subtotal || 0).toFixed(2)} | Payment {record.pharmacySale?.paymentStatus || 'pending'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link className="rounded-2xl border border-cyan-300 px-4 py-3 text-sm font-semibold text-cyan-700 hover:bg-cyan-50" to={`/pharmacy/dispensings/${record._id}`}>
                    Open record
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default DispensingListPage;
