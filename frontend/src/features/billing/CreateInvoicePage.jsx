import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import { consultationApi, patientApi } from '../../lib/api';
import BillingSummaryCards from './BillingSummaryCards';
import InvoiceItemsTable from './InvoiceItemsTable';
import { createInvoice, previewInvoiceTotals } from './billing.api';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

const createEmptyItem = () => ({
  itemType: 'consultation',
  name: '',
  description: '',
  quantity: 1,
  unitPrice: ''
});

const CreateInvoicePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const consultationId = searchParams.get('consultationId') || '';
  const appointmentId = searchParams.get('appointmentId') || '';
  const presetPatientId = searchParams.get('patientId') || '';

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [consultation, setConsultation] = useState(null);
  const [form, setForm] = useState({
    patientId: presetPatientId,
    dueDate: '',
    items: [createEmptyItem()],
    discountType: 'none',
    discountValue: '',
    gstRate: 18,
    notes: ''
  });

  useEffect(() => {
    let isMounted = true;

    const loadContext = async () => {
      setLoading(true);
      setError('');

      try {
        const [patientsResponse, consultationResponse] = await Promise.all([
          patientApi.list({ limit: 100 }),
          consultationId ? consultationApi.get(consultationId) : Promise.resolve(null)
        ]);

        if (!isMounted) {
          return;
        }

        setPatients(patientsResponse.data.patients || []);

        if (consultationResponse?.data?.consultation) {
          const nextConsultation = consultationResponse.data.consultation;
          setConsultation(nextConsultation);
          setForm((current) => ({
            ...current,
            patientId: current.patientId || nextConsultation.patientId?._id || '',
            items:
              current.items.length > 0
                ? current.items
                : [
                    {
                      itemType: 'consultation',
                      name: nextConsultation.chiefComplaint || 'Consultation service',
                      description: nextConsultation.treatmentPlan || '',
                      quantity: 1,
                      unitPrice: ''
                    }
                  ],
            notes: nextConsultation.clinicalNotes || current.notes
          }));
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load invoice creation context.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadContext();

    return () => {
      isMounted = false;
    };
  }, [consultationId]);

  const preview = useMemo(
    () =>
      previewInvoiceTotals({
        items: form.items.map((item) => ({
          ...item,
          quantity: Number(item.quantity || 0),
          unitPrice: Number(item.unitPrice || 0)
        })),
        discountType: form.discountType,
        discountValue: Number(form.discountValue || 0),
        gstRate: Number(form.gstRate || 0)
      }),
    [form]
  );

  const handleItemChange = (index, field, value) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    }));
  };

  const handleAddItem = () => {
    setForm((current) => ({
      ...current,
      items: [...current.items, createEmptyItem()]
    }));
  };

  const handleRemoveItem = (index) => {
    setForm((current) => {
      const nextItems = current.items.filter((_, itemIndex) => itemIndex !== index);

      return {
        ...current,
        items: nextItems.length ? nextItems : [createEmptyItem()]
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await createInvoice({
        patientId: form.patientId,
        ...(appointmentId ? { appointmentId } : {}),
        ...(consultationId ? { consultationId } : {}),
        ...(form.dueDate ? { dueDate: form.dueDate } : {}),
        items: form.items.map((item) => ({
          itemType: item.itemType,
          name: item.name,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice)
        })),
        discountType: form.discountType,
        discountValue: Number(form.discountValue || 0),
        gstRate: Number(form.gstRate || 0),
        notes: form.notes
      });

      navigate(`/billing/${response.data.invoice._id}`, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create invoice.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading invoice workspace..." />;
  }

  if (error && !patients.length) {
    return <ErrorState title="Invoice workspace unavailable" description={error} />;
  }

  if (!patients.length) {
    return <EmptyState title="No patients available" description="Create a patient before generating invoices." />;
  }

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Phase 8</p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-900">Create invoice</h1>
          <p className="mt-2 text-sm text-stone-600">Totals shown here are previews only. The backend recalculates subtotal, discount, GST, paid, and due values on save.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50" to="/billing">
            Back to billing
          </Link>
          {consultation?._id ? (
            <Link className="rounded-2xl border border-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50" to={`/consultations/${consultation._id}`}>
              Open consultation
            </Link>
          ) : null}
        </div>
      </div>

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <BillingSummaryCards
        summary={{
          totalRevenue: preview.totalAmount,
          pendingAmount: preview.dueAmount,
          paidInvoices: preview.paidAmount > 0 && preview.dueAmount === 0 ? 1 : 0,
          unpaidInvoices: preview.paymentStatus === 'unpaid' ? 1 : 0,
          todayRevenue: preview.gstAmount
        }}
      />

      <form className="grid gap-6" onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <InvoiceItemsTable
            items={form.items}
            editable
            onItemChange={handleItemChange}
            onAddItem={handleAddItem}
            onRemoveItem={handleRemoveItem}
          />

          <article className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
            <h2 className="text-xl font-semibold text-stone-900">Invoice details</h2>

            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Patient</span>
              <select
                className={FIELD_CLASS}
                value={form.patientId}
                onChange={(event) => setForm((current) => ({ ...current, patientId: event.target.value }))}
                required
              >
                <option value="">Select patient</option>
                {patients.map((patient) => (
                  <option key={patient._id} value={patient._id}>
                    {patient.fullName} ({patient.patientId})
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Due date</span>
              <input
                className={FIELD_CLASS}
                type="date"
                value={form.dueDate}
                onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-stone-700">
                <span>Discount type</span>
                <select
                  className={FIELD_CLASS}
                  value={form.discountType}
                  onChange={(event) => setForm((current) => ({ ...current, discountType: event.target.value }))}
                >
                  <option value="none">None</option>
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm font-medium text-stone-700">
                <span>Discount value</span>
                <input
                  className={FIELD_CLASS}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.discountValue}
                  onChange={(event) => setForm((current) => ({ ...current, discountValue: event.target.value }))}
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>GST rate</span>
              <input
                className={FIELD_CLASS}
                type="number"
                min="0"
                max="28"
                step="0.01"
                value={form.gstRate}
                onChange={(event) => setForm((current) => ({ ...current, gstRate: event.target.value }))}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Notes</span>
              <textarea
                className={FIELD_CLASS}
                rows={4}
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </label>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-700">
              <p>Subtotal: INR {preview.subtotal.toFixed(2)}</p>
              <p className="mt-1">Discount: INR {preview.discountAmount.toFixed(2)}</p>
              <p className="mt-1">GST: INR {preview.gstAmount.toFixed(2)}</p>
              <p className="mt-1 font-semibold text-stone-900">Total: INR {preview.totalAmount.toFixed(2)}</p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-stone-300"
            >
              {saving ? 'Creating...' : 'Create invoice'}
            </button>
          </article>
        </div>
      </form>
    </section>
  );
};

export default CreateInvoicePage;
