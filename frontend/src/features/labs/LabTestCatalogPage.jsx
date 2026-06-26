import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import PageHeader from '../../components/layout/PageHeader';
import { createLabTest, listLabTests, updateLabTest } from './labApi';
import { ADMIN_ROLES, ROLES } from '../../constants/roles';
import useAuth from '../../hooks/useAuth';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

const createInitialForm = () => ({
  code: '',
  name: '',
  category: '',
  specimenType: '',
  unit: '',
  normalRangeText: '',
  price: ''
});

const LabTestCatalogPage = () => {
  const { user } = useAuth();
  const canManageCatalog = ADMIN_ROLES.includes(user?.role) || user?.role === ROLES.LAB_TECHNICIAN;
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    isActive: 'true'
  });
  const [form, setForm] = useState(createInitialForm());
  const [labTests, setLabTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadLabTests = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await listLabTests({
          limit: 50,
          ...(filters.search ? { search: filters.search } : {}),
          ...(filters.category ? { category: filters.category } : {}),
          ...(filters.isActive !== 'all' ? { isActive: filters.isActive === 'true' } : {})
        });

        if (isMounted) {
          setLabTests(response.data.labTests || []);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load lab catalog.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadLabTests();

    return () => {
      isMounted = false;
    };
  }, [filters.category, filters.isActive, filters.search]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      await createLabTest({
        code: form.code,
        name: form.name,
        category: form.category,
        specimenType: form.specimenType,
        unit: form.unit,
        normalRange: form.normalRangeText ? { text: form.normalRangeText } : {},
        ...(form.price ? { price: Number(form.price) } : {})
      });
      setForm(createInitialForm());

      const response = await listLabTests({ limit: 50, isActive: true });
      setLabTests(response.data.labTests || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create the lab test.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (labTest) => {
    try {
      await updateLabTest(labTest._id, { isActive: !labTest.isActive });
      const response = await listLabTests({
        limit: 50,
        ...(filters.search ? { search: filters.search } : {}),
        ...(filters.category ? { category: filters.category } : {}),
        ...(filters.isActive !== 'all' ? { isActive: filters.isActive === 'true' } : {})
      });
      setLabTests(response.data.labTests || []);
    } catch (requestError) {
      alert(requestError.response?.data?.message || 'Unable to update the lab test.');
    }
  };

  if (loading) {
    return <LoadingState label="Loading lab catalog..." />;
  }

  if (error && !labTests.length && !canManageCatalog) {
    return <ErrorState title="Lab catalog unavailable" description={error} />;
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Phase 11"
        title="Lab test catalog"
        description="Manage reusable clinic-scoped test definitions and reference details for lab ordering."
        actions={
          <>
            <Link className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50" to="/labs/orders">
              Open lab orders
            </Link>
          </>
        }
      />

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        {canManageCatalog ? (
          <form className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40" onSubmit={handleCreate}>
            <div>
              <h2 className="text-xl font-semibold text-stone-900">Create catalog item</h2>
              <p className="mt-2 text-sm text-stone-600">Admins can seed reusable tests for doctors and lab staff.</p>
            </div>

            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Test code</span>
              <input className={FIELD_CLASS} value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} required />
            </label>
            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Name</span>
              <input className={FIELD_CLASS} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
            </label>
            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Category</span>
              <input className={FIELD_CLASS} value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} required />
            </label>
            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Specimen type</span>
              <input className={FIELD_CLASS} value={form.specimenType} onChange={(event) => setForm((current) => ({ ...current, specimenType: event.target.value }))} required />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-stone-700">
                <span>Unit</span>
                <input className={FIELD_CLASS} value={form.unit} onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))} />
              </label>
              <label className="grid gap-2 text-sm font-medium text-stone-700">
                <span>Price</span>
                <input
                  className={FIELD_CLASS}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Reference range note</span>
              <textarea
                className={FIELD_CLASS}
                rows={3}
                value={form.normalRangeText}
                onChange={(event) => setForm((current) => ({ ...current, normalRangeText: event.target.value }))}
              />
            </label>

            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-stone-300"
            >
              {saving ? 'Saving...' : 'Create lab test'}
            </button>
          </form>
        ) : null}

        <div className="grid gap-4">
          <div className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Search</span>
              <input
                className={FIELD_CLASS}
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="Search by name or code"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Category</span>
              <input
                className={FIELD_CLASS}
                value={filters.category}
                onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
                placeholder="Hematology"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Status</span>
              <select className={FIELD_CLASS} value={filters.isActive} onChange={(event) => setFilters((current) => ({ ...current, isActive: event.target.value }))}>
                <option value="true">Active only</option>
                <option value="false">Inactive only</option>
                <option value="all">All</option>
              </select>
            </label>
          </div>

          {!labTests.length ? (
            <EmptyState title="No lab tests found" description="Create the clinic catalog first so doctors can add tests to a lab order." />
          ) : (
            <div className="grid gap-4">
              {labTests.map((labTest) => (
                <article key={labTest._id} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/40">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-semibold text-stone-900">{labTest.name}</h3>
                        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">{labTest.code}</span>
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{labTest.category}</span>
                      </div>
                      <p className="mt-2 text-sm text-stone-600">
                        Specimen: {labTest.specimenType || 'Not provided'} | Unit: {labTest.unit || 'Not provided'}
                      </p>
                      <p className="mt-1 text-sm text-stone-600">
                        Reference: {labTest.normalRange?.text || [labTest.normalRange?.min, labTest.normalRange?.max].filter((value) => typeof value !== 'undefined').join(' - ') || 'Not provided'}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <p className="text-sm font-semibold text-stone-900">INR {Number(labTest.price || 0).toFixed(2)}</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-stone-500">{labTest.isActive ? 'Active' : 'Inactive'}</p>
                      {canManageCatalog ? (
                        <button
                          onClick={() => handleToggleActive(labTest)}
                          className={`mt-2 rounded-xl px-3 py-1.5 text-xs font-semibold border transition ${
                            labTest.isActive
                              ? 'border-rose-300 text-rose-700 hover:bg-rose-50'
                              : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {labTest.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      ) : null}
                    </div>
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

export default LabTestCatalogPage;
