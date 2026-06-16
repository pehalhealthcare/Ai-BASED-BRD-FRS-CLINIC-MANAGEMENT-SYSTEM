import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import Badge from '../../components/common/Badge';
import PageHeader from '../../components/layout/PageHeader';
import { ADMIN_ROLES, ROLES } from '../../constants/roles';
import useAuth from '../../hooks/useAuth';
import { addMedicineBatch, getMedicine, getMedicineForecast, updateMedicine } from './pharmacyApi';
import BatchTable from './BatchTable';
import StockFlagBadge from './StockFlagBadge';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

const createEmptyBatch = () => ({
  batchNumber: '',
  quantity: '',
  expiryDate: '',
  purchasePrice: '',
  sellingPrice: ''
});

const riskToneMap = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
  available: 'success',
  fallback: 'warning',
  insufficient_data: 'warning',
  unavailable: 'danger'
};

const formatRiskLabel = (value) => String(value || 'unknown').replace(/_/g, ' ');

const MedicineDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const canManageMedicines = ADMIN_ROLES.includes(user?.role) || user?.role === ROLES.PHARMACIST;
  const [medicine, setMedicine] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [form, setForm] = useState(null);
  const [newBatch, setNewBatch] = useState(createEmptyBatch());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [batchSaving, setBatchSaving] = useState(false);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState('');
  const [error, setError] = useState('');

  const applyMedicine = (nextMedicine) => {
    setMedicine(nextMedicine);
    setForm({
      code: nextMedicine.code || '',
      name: nextMedicine.name || '',
      genericName: nextMedicine.genericName || '',
      brandName: nextMedicine.brandName || '',
      category: nextMedicine.category || '',
      form: nextMedicine.form || '',
      strength: nextMedicine.strength || '',
      manufacturer: nextMedicine.manufacturer || '',
      unitPrice: nextMedicine.unitPrice ?? 0,
      reorderLevel: nextMedicine.reorderLevel ?? 0,
      supplierLeadTimeDays: nextMedicine.supplierLeadTimeDays ?? 7,
      isActive: Boolean(nextMedicine.isActive),
      requiresPrescription: Boolean(nextMedicine.requiresPrescription)
    });
  };

  const loadMedicine = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await getMedicine(id);
      applyMedicine(response.data.medicine);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load medicine.');
    } finally {
      setLoading(false);
    }
  };

  const loadForecast = async () => {
    if (!canManageMedicines) {
      setForecast(null);
      setForecastError('');
      return;
    }

    setForecastLoading(true);
    setForecastError('');

    try {
      const response = await getMedicineForecast(id);
      setForecast(response.data.forecast);
    } catch (requestError) {
      setForecast(null);
      setForecastError(requestError.response?.data?.message || 'Unable to load pharmacy forecast.');
    } finally {
      setForecastLoading(false);
    }
  };

  useEffect(() => {
    loadMedicine();
    loadForecast();
  }, [id, canManageMedicines]);

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await updateMedicine(id, {
        code: form.code,
        name: form.name,
        genericName: form.genericName,
        brandName: form.brandName,
        category: form.category,
        form: form.form,
        strength: form.strength,
        manufacturer: form.manufacturer,
        unitPrice: Number(form.unitPrice || 0),
        reorderLevel: Number(form.reorderLevel || 0),
        supplierLeadTimeDays: Number(form.supplierLeadTimeDays || 0),
        isActive: Boolean(form.isActive),
        requiresPrescription: Boolean(form.requiresPrescription)
      });
      applyMedicine(response.data.medicine);
      await loadForecast();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update medicine.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddBatch = async (event) => {
    event.preventDefault();
    setBatchSaving(true);
    setError('');

    try {
      const response = await addMedicineBatch(id, {
        batchNumber: newBatch.batchNumber,
        quantity: Number(newBatch.quantity),
        ...(newBatch.expiryDate ? { expiryDate: newBatch.expiryDate } : {}),
        ...(newBatch.purchasePrice !== '' ? { purchasePrice: Number(newBatch.purchasePrice) } : {}),
        ...(newBatch.sellingPrice !== '' ? { sellingPrice: Number(newBatch.sellingPrice) } : {})
      });
      applyMedicine(response.data.medicine);
      setNewBatch(createEmptyBatch());
      await loadForecast();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to add batch.');
    } finally {
      setBatchSaving(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading medicine detail..." />;
  }

  if (error && !medicine) {
    return <ErrorState title="Medicine unavailable" description={error} />;
  }

  if (!medicine || !form) {
    return <ErrorState title="Medicine unavailable" description="No medicine was returned." />;
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Phase 12"
        title={medicine.name || 'Medicine detail'}
        description="Review stock, manage medicine metadata, and add new batches without leaving the pharmacy workspace."
        actions={
          <>
            <Link className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50" to="/pharmacy/medicines">
              Back to catalog
            </Link>
            {canManageMedicines ? (
              <Link className="rounded-2xl border border-cyan-300 px-4 py-3 text-sm font-semibold text-cyan-700 hover:bg-cyan-50" to="/pharmacy/dispensings">
                Dispensing records
              </Link>
            ) : null}
          </>
        }
      />

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-6">
          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
            <div className="flex flex-wrap gap-2">
              {medicine.code ? <Badge tone="neutral">{medicine.code}</Badge> : null}
              {medicine.stockFlags?.lowStock ? <StockFlagBadge flag="lowStock" /> : null}
              {medicine.stockFlags?.nearExpiry ? <StockFlagBadge flag="nearExpiry" /> : null}
              {medicine.stockFlags?.expired ? <StockFlagBadge flag="expired" /> : null}
            </div>
            <dl className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-stone-50 p-4">
                <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">Generic</dt>
                <dd className="mt-2 text-sm font-medium text-stone-900">{medicine.genericName || 'Not provided'}</dd>
              </div>
              <div className="rounded-2xl bg-stone-50 p-4">
                <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">Brand</dt>
                <dd className="mt-2 text-sm font-medium text-stone-900">{medicine.brandName || 'Not provided'}</dd>
              </div>
              <div className="rounded-2xl bg-stone-50 p-4">
                <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">Available stock</dt>
                <dd className="mt-2 text-sm font-medium text-stone-900">{medicine.totalStock ?? 0}</dd>
              </div>
              <div className="rounded-2xl bg-stone-50 p-4">
                <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">Reorder level</dt>
                <dd className="mt-2 text-sm font-medium text-stone-900">{medicine.reorderLevel ?? 0}</dd>
              </div>
              <div className="rounded-2xl bg-stone-50 p-4 md:col-span-2">
                <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">Supplier lead time</dt>
                <dd className="mt-2 text-sm font-medium text-stone-900">{medicine.supplierLeadTimeDays ?? 7} days</dd>
              </div>
            </dl>
          </article>

          {canManageMedicines ? (
            <article className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-stone-900">AI Stock Intelligence</h2>
                  <p className="mt-1 text-sm text-stone-500">
                    Assistive pharmacy demand forecasting for admin and pharmacist review only.
                  </p>
                </div>
                {forecast?.model_status ? (
                  <Badge tone={riskToneMap[forecast.model_status] || 'neutral'}>
                    {formatRiskLabel(forecast.model_status)}
                  </Badge>
                ) : null}
              </div>

              {forecastLoading ? <p className="text-sm text-stone-500">Loading demand forecast...</p> : null}
              {forecastError ? (
                <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{forecastError}</p>
              ) : null}

              {forecast && !forecastLoading ? (
                <>
                  {forecast.model_status !== 'available' ? (
                    <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      Forecast unavailable. Showing rule-based reorder status.
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={riskToneMap[forecast.risk_level] || 'neutral'}>
                      Risk: {formatRiskLabel(forecast.risk_level)}
                    </Badge>
                    <Badge tone={riskToneMap[forecast.output?.stockout_risk] || 'neutral'}>
                      Stockout: {formatRiskLabel(forecast.output?.stockout_risk)}
                    </Badge>
                    <Badge tone={riskToneMap[forecast.output?.expiry_risk] || 'neutral'}>
                      Expiry: {formatRiskLabel(forecast.output?.expiry_risk)}
                    </Badge>
                    <Badge tone={forecast.output?.reorder_alert ? 'danger' : 'success'}>
                      {forecast.output?.reorder_alert ? 'Reorder Alert' : 'Stock Looks Stable'}
                    </Badge>
                  </div>

                  <dl className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl bg-stone-50 p-4">
                      <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">Next 7 days demand</dt>
                      <dd className="mt-2 text-lg font-semibold text-stone-900">{forecast.output?.next_7_days_demand ?? 0}</dd>
                    </div>
                    <div className="rounded-2xl bg-stone-50 p-4">
                      <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">Next 30 days demand</dt>
                      <dd className="mt-2 text-lg font-semibold text-stone-900">{forecast.output?.next_30_days_demand ?? 0}</dd>
                    </div>
                    <div className="rounded-2xl bg-stone-50 p-4">
                      <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">Suggested reorder quantity</dt>
                      <dd className="mt-2 text-lg font-semibold text-stone-900">{forecast.output?.reorder_quantity ?? 0}</dd>
                    </div>
                    <div className="rounded-2xl bg-stone-50 p-4">
                      <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">Days until stockout</dt>
                      <dd className="mt-2 text-lg font-semibold text-stone-900">
                        {forecast.output?.days_until_stockout ?? 'Not enough usage data'}
                      </dd>
                    </div>
                  </dl>

                  <div className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                    <p className="text-sm font-semibold text-stone-900">Reason codes</p>
                    <div className="flex flex-wrap gap-2">
                      {(forecast.output?.reason_codes || []).length ? (
                        forecast.output.reason_codes.map((reasonCode) => (
                          <Badge key={reasonCode} tone="info">
                            {reasonCode}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-stone-500">No alert codes returned.</span>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-2 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
                    <p>
                      <span className="font-semibold text-stone-900">Model:</span> {forecast.model_name || 'Unknown'}{' '}
                      {forecast.model_version ? `(${forecast.model_version})` : ''}
                    </p>
                    <p>
                      <span className="font-semibold text-stone-900">Confidence:</span> {forecast.confidence ?? 0}
                    </p>
                    <p>
                      <span className="font-semibold text-stone-900">Explanation:</span> {forecast.explanation}
                    </p>
                  </div>
                </>
              ) : null}
            </article>
          ) : null}

          {canManageMedicines ? (
            <form className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40" onSubmit={handleSave}>
              <h2 className="text-xl font-semibold text-stone-900">Update medicine</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  <span>Code</span>
                  <input className={FIELD_CLASS} value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} />
                </label>
                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  <span>Name</span>
                  <input className={FIELD_CLASS} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
                </label>
                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  <span>Generic name</span>
                  <input className={FIELD_CLASS} value={form.genericName} onChange={(event) => setForm((current) => ({ ...current, genericName: event.target.value }))} />
                </label>
                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  <span>Brand name</span>
                  <input className={FIELD_CLASS} value={form.brandName} onChange={(event) => setForm((current) => ({ ...current, brandName: event.target.value }))} />
                </label>
                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  <span>Category</span>
                  <input className={FIELD_CLASS} value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} />
                </label>
                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  <span>Form</span>
                  <input className={FIELD_CLASS} value={form.form} onChange={(event) => setForm((current) => ({ ...current, form: event.target.value }))} />
                </label>
                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  <span>Strength</span>
                  <input className={FIELD_CLASS} value={form.strength} onChange={(event) => setForm((current) => ({ ...current, strength: event.target.value }))} />
                </label>
                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  <span>Manufacturer</span>
                  <input className={FIELD_CLASS} value={form.manufacturer} onChange={(event) => setForm((current) => ({ ...current, manufacturer: event.target.value }))} />
                </label>
                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  <span>Unit price</span>
                  <input className={FIELD_CLASS} type="number" min="0" step="0.01" value={form.unitPrice} onChange={(event) => setForm((current) => ({ ...current, unitPrice: event.target.value }))} />
                </label>
                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  <span>Reorder level</span>
                  <input className={FIELD_CLASS} type="number" min="0" step="1" value={form.reorderLevel} onChange={(event) => setForm((current) => ({ ...current, reorderLevel: event.target.value }))} />
                </label>
                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  <span>Supplier lead time (days)</span>
                  <input
                    className={FIELD_CLASS}
                    type="number"
                    min="0"
                    step="1"
                    value={form.supplierLeadTimeDays}
                    onChange={(event) => setForm((current) => ({ ...current, supplierLeadTimeDays: event.target.value }))}
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-3 text-sm font-medium text-stone-700">
                  <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
                  Active
                </label>
                <label className="flex items-center gap-3 text-sm font-medium text-stone-700">
                  <input
                    type="checkbox"
                    checked={form.requiresPrescription}
                    onChange={(event) => setForm((current) => ({ ...current, requiresPrescription: event.target.checked }))}
                  />
                  Requires prescription
                </label>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-stone-300"
              >
                {saving ? 'Saving...' : 'Save medicine'}
              </button>
            </form>
          ) : null}
        </div>

        <div className="grid gap-6">
          {canManageMedicines ? (
            <form className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40" onSubmit={handleAddBatch}>
              <h2 className="text-xl font-semibold text-stone-900">Add stock batch</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  <span>Batch number</span>
                  <input className={FIELD_CLASS} value={newBatch.batchNumber} onChange={(event) => setNewBatch((current) => ({ ...current, batchNumber: event.target.value }))} required />
                </label>
                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  <span>Quantity</span>
                  <input className={FIELD_CLASS} type="number" min="1" step="1" value={newBatch.quantity} onChange={(event) => setNewBatch((current) => ({ ...current, quantity: event.target.value }))} required />
                </label>
                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  <span>Expiry date</span>
                  <input className={FIELD_CLASS} type="date" value={newBatch.expiryDate} onChange={(event) => setNewBatch((current) => ({ ...current, expiryDate: event.target.value }))} />
                </label>
                <label className="grid gap-2 text-sm font-medium text-stone-700">
                  <span>Purchase price</span>
                  <input className={FIELD_CLASS} type="number" min="0" step="0.01" value={newBatch.purchasePrice} onChange={(event) => setNewBatch((current) => ({ ...current, purchasePrice: event.target.value }))} />
                </label>
                <label className="grid gap-2 text-sm font-medium text-stone-700 md:col-span-2">
                  <span>Selling price</span>
                  <input className={FIELD_CLASS} type="number" min="0" step="0.01" value={newBatch.sellingPrice} onChange={(event) => setNewBatch((current) => ({ ...current, sellingPrice: event.target.value }))} />
                </label>
              </div>
              <button
                type="submit"
                disabled={batchSaving}
                className="rounded-2xl border border-cyan-300 px-4 py-3 text-sm font-semibold text-cyan-700 hover:bg-cyan-50 disabled:border-stone-300 disabled:text-stone-400"
              >
                {batchSaving ? 'Adding batch...' : 'Add batch'}
              </button>
            </form>
          ) : null}

          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
            <h2 className="text-xl font-semibold text-stone-900">Batch stock</h2>
            <div className="mt-5">
              <BatchTable batches={medicine.batches || []} />
            </div>
          </article>
        </div>
      </div>
    </section>
  );
};

export default MedicineDetailPage;
