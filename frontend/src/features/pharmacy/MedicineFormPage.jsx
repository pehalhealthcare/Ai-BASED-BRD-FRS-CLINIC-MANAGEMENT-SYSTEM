import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import PageHeader from '../../components/layout/PageHeader';
import { createMedicine } from './pharmacyApi';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

const createEmptyBatch = () => ({
  batchNumber: '',
  quantity: 0,
  expiryDate: '',
  purchasePrice: '',
  sellingPrice: ''
});

const MedicineFormPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    code: '',
    name: '',
    genericName: '',
    brandName: '',
    category: '',
    form: '',
    strength: '',
    manufacturer: '',
    unitPrice: '',
    reorderLevel: '',
    supplierLeadTimeDays: 7,
    requiresPrescription: true,
    batches: [createEmptyBatch()]
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateBatch = (index, field, value) => {
    setForm((current) => ({
      ...current,
      batches: current.batches.map((batch, batchIndex) =>
        batchIndex === index
          ? {
              ...batch,
              [field]: value
            }
          : batch
      )
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await createMedicine({
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
        requiresPrescription: Boolean(form.requiresPrescription),
        batches: form.batches
          .filter((batch) => batch.batchNumber && Number(batch.quantity) > 0)
          .map((batch) => ({
            batchNumber: batch.batchNumber,
            quantity: Number(batch.quantity),
            ...(batch.expiryDate ? { expiryDate: batch.expiryDate } : {}),
            ...(batch.purchasePrice !== '' ? { purchasePrice: Number(batch.purchasePrice) } : {}),
            ...(batch.sellingPrice !== '' ? { sellingPrice: Number(batch.sellingPrice) } : {})
          }))
      });

      navigate(`/pharmacy/medicines/${response.data.medicine._id}`, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create medicine.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Phase 12"
        title="Create medicine"
        description="Seed the clinic pharmacy catalog with medicine metadata and opening stock batches."
        actions={
          <>
            <Link className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50" to="/pharmacy/medicines">
              Back to catalog
            </Link>
          </>
        }
      />

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <form className="grid gap-6" onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <article className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
            <h2 className="text-xl font-semibold text-stone-900">Medicine details</h2>

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
                <input className={FIELD_CLASS} value={form.form} onChange={(event) => setForm((current) => ({ ...current, form: event.target.value }))} placeholder="Tablet" />
              </label>
              <label className="grid gap-2 text-sm font-medium text-stone-700">
                <span>Strength</span>
                <input className={FIELD_CLASS} value={form.strength} onChange={(event) => setForm((current) => ({ ...current, strength: event.target.value }))} placeholder="500 mg" />
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

            <label className="flex items-center gap-3 text-sm font-medium text-stone-700">
              <input type="checkbox" checked={form.requiresPrescription} onChange={(event) => setForm((current) => ({ ...current, requiresPrescription: event.target.checked }))} />
              Requires prescription
            </label>
          </article>

          <article className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-stone-900">Opening batches</h2>
              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, batches: [...current.batches, createEmptyBatch()] }))}
                className="rounded-2xl border border-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                Add batch
              </button>
            </div>

            <div className="grid gap-4">
              {form.batches.map((batch, index) => (
                <div key={`batch-${index}`} className="grid gap-4 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-sm font-medium text-stone-700">
                      <span>Batch number</span>
                      <input className={FIELD_CLASS} value={batch.batchNumber} onChange={(event) => updateBatch(index, 'batchNumber', event.target.value)} />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-stone-700">
                      <span>Quantity</span>
                      <input className={FIELD_CLASS} type="number" min="0" step="1" value={batch.quantity} onChange={(event) => updateBatch(index, 'quantity', event.target.value)} />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-stone-700">
                      <span>Expiry date</span>
                      <input className={FIELD_CLASS} type="date" value={batch.expiryDate} onChange={(event) => updateBatch(index, 'expiryDate', event.target.value)} />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-stone-700">
                      <span>Purchase price</span>
                      <input className={FIELD_CLASS} type="number" min="0" step="0.01" value={batch.purchasePrice} onChange={(event) => updateBatch(index, 'purchasePrice', event.target.value)} />
                    </label>
                    <label className="grid gap-2 text-sm font-medium text-stone-700 md:col-span-2">
                      <span>Selling price</span>
                      <input className={FIELD_CLASS} type="number" min="0" step="0.01" value={batch.sellingPrice} onChange={(event) => updateBatch(index, 'sellingPrice', event.target.value)} />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-stone-300"
        >
          {saving ? 'Saving...' : 'Create medicine'}
        </button>
      </form>
    </section>
  );
};

export default MedicineFormPage;
