import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import Badge from '../../components/common/Badge';
import PageHeader from '../../components/layout/PageHeader';
import { ADMIN_ROLES, ROLES } from '../../constants/roles';
import useAuth from '../../hooks/useAuth';
import { listMedicines } from './pharmacyApi';
import StockFlagBadge from './StockFlagBadge';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-white';

const MedicineCatalogPage = () => {
  const { user } = useAuth();
  const canManageMedicines = ADMIN_ROLES.includes(user?.role) || user?.role === ROLES.PHARMACIST;
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    lowStock: 'all',
    nearExpiry: 'all',
    isActive: 'true'
  });
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadMedicines = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await listMedicines({
          limit: 50,
          ...(filters.search ? { search: filters.search } : {}),
          ...(filters.category ? { category: filters.category } : {}),
          ...(filters.lowStock !== 'all' ? { lowStock: filters.lowStock === 'true' } : {}),
          ...(filters.nearExpiry !== 'all' ? { nearExpiry: filters.nearExpiry === 'true' } : {}),
          ...(filters.isActive !== 'all' ? { isActive: filters.isActive === 'true' } : {})
        });

        if (isMounted) {
          setMedicines(response.data.medicines || []);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load medicines.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadMedicines();

    return () => {
      isMounted = false;
    };
  }, [filters.category, filters.isActive, filters.lowStock, filters.nearExpiry, filters.search]);

  if (loading) {
    return <LoadingState label="Loading medicine catalog..." />;
  }

  if (error && !medicines.length) {
    return <ErrorState title="Medicine catalog unavailable" description={error} />;
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Phase 12"
        title="Medicine catalog"
        description="Browse clinic-scoped medicines, stock levels, and expiry risk before dispensing."
        actions={
          <>
            {canManageMedicines ? (
              <Link className="rounded-2xl border border-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50" to="/pharmacy/medicines/new">
                Add medicine
              </Link>
            ) : null}
            {canManageMedicines ? (
              <Link className="rounded-2xl border border-cyan-300 px-4 py-3 text-sm font-semibold text-cyan-700 hover:bg-cyan-50" to="/pharmacy/dispensings">
                View dispensings
              </Link>
            ) : null}
          </>
        }
      />

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <div className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 md:grid-cols-5">
        <label className="grid gap-2 text-sm font-medium text-stone-700 md:col-span-2">
          <span>Search</span>
          <input
            className={FIELD_CLASS}
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="Search by name, code, or generic name"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-stone-700">
          <span>Category</span>
          <input
            className={FIELD_CLASS}
            value={filters.category}
            onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
            placeholder="Analgesic"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-stone-700">
          <span>Low stock</span>
          <select className={FIELD_CLASS} value={filters.lowStock} onChange={(event) => setFilters((current) => ({ ...current, lowStock: event.target.value }))}>
            <option value="all">All</option>
            <option value="true">Low stock only</option>
            <option value="false">Healthy stock only</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-stone-700">
          <span>Near expiry</span>
          <select className={FIELD_CLASS} value={filters.nearExpiry} onChange={(event) => setFilters((current) => ({ ...current, nearExpiry: event.target.value }))}>
            <option value="all">All</option>
            <option value="true">Near expiry only</option>
            <option value="false">Not near expiry</option>
          </select>
        </label>
      </div>

      {!medicines.length ? (
        <EmptyState title="No medicines found" description="Create the pharmacy catalog before dispensing against prescriptions." />
      ) : (
        <div className="grid gap-4">
          {medicines.map((medicine) => (
            <article key={medicine._id} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/40">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-semibold text-stone-900">{medicine.name}</h2>
                    {medicine.code ? <Badge tone="neutral">{medicine.code}</Badge> : null}
                    {medicine.category ? <Badge tone="info">{medicine.category}</Badge> : null}
                    {!medicine.isActive ? <Badge tone="danger">Inactive</Badge> : null}
                  </div>
                  <p className="mt-2 text-sm text-stone-600">
                    {medicine.genericName || 'Generic name not provided'} | {medicine.form || 'Form not provided'} | {medicine.strength || 'Strength not provided'}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    Stock: {medicine.totalStock ?? 0} | Reorder level: {medicine.reorderLevel ?? 0} | Unit price: INR {Number(medicine.unitPrice || 0).toFixed(2)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {medicine.stockFlags?.lowStock ? <StockFlagBadge flag="lowStock" /> : null}
                    {medicine.stockFlags?.nearExpiry ? <StockFlagBadge flag="nearExpiry" /> : null}
                    {medicine.stockFlags?.expired ? <StockFlagBadge flag="expired" /> : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link className="rounded-2xl border border-cyan-300 px-4 py-3 text-sm font-semibold text-cyan-700 hover:bg-cyan-50" to={`/pharmacy/medicines/${medicine._id}`}>
                    Open medicine
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

export default MedicineCatalogPage;
