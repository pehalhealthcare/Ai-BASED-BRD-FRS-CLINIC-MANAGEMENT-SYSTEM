import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import { getCurrentUserFromStorage } from '../../lib/auth';
import BillingSummaryCards from './BillingSummaryCards';
import InvoiceItemsTable from './InvoiceItemsTable';
import PaymentForm from './PaymentForm';
import {
  cancelInvoice,
  downloadInvoicePdf,
  generateInvoicePdf,
  getInvoiceById,
  recordPayment,
  recordRefund,
  updateInvoice,
  previewInvoiceTotals,
  createRazorpayOrder,
  verifyRazorpayPayment
} from './billing.api';
import useRazorpay from '../../hooks/useRazorpay';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

const buildFormFromInvoice = (invoice) => ({
  dueDate: invoice?.dueDate?.slice?.(0, 10) || invoice?.dueDate || '',
  items:
    invoice?.items?.map((item) => ({
      itemType: item.itemType || 'other',
      name: item.name || '',
      description: item.description || '',
      quantity: item.quantity ?? 1,
      unitPrice: item.unitPrice ?? ''
    })) || [],
  discountType: invoice?.discountType || 'none',
  discountValue: invoice?.discountValue ?? '',
  gstRate: invoice?.gstRate ?? 18,
  notes: invoice?.notes || ''
});

const InvoiceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = getCurrentUserFromStorage();
  const [invoice, setInvoice] = useState(null);
  const [form, setForm] = useState(buildFormFromInvoice(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paying, setPaying] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [razorpayLoading, setRazorpayLoading] = useState(false);
  const [error, setError] = useState('');
  const [refundForm, setRefundForm] = useState({ amount: '', reason: '' });
  const [refunding, setRefunding] = useState(false);
  const [refundMessage, setRefundMessage] = useState('');
  
  const isRazorpayLoaded = useRazorpay();

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
  const isReceptionist = currentUser?.role === 'RECEPTIONIST';
  const canMutateBilling = isAdmin || isReceptionist;
  const isDraft = invoice?.invoiceStatus === 'draft';

  const preview = useMemo(
    () =>
      previewInvoiceTotals({
        items: form.items,
        discountType: form.discountType,
        discountValue: Number(form.discountValue || 0),
        gstRate: Number(form.gstRate || 0),
        payments: invoice?.payments || []
      }),
    [form, invoice]
  );

  const loadInvoice = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await getInvoiceById(id);
      setInvoice(response.data.invoice);
      setForm(buildFormFromInvoice(response.data.invoice));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load invoice.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoice();
  }, [id]);

  const handleItemChange = (index, field, value) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    }));
  };

  const handleAddItem = () => {
    setForm((current) => ({
      ...current,
      items: [...current.items, { itemType: 'other', name: '', description: '', quantity: 1, unitPrice: '' }]
    }));
  };

  const handleRemoveItem = (index) => {
    setForm((current) => {
      const nextItems = current.items.filter((_, itemIndex) => itemIndex !== index);
      return {
        ...current,
        items: nextItems.length ? nextItems : [{ itemType: 'other', name: '', description: '', quantity: 1, unitPrice: '' }]
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      const payload = isDraft
        ? {
            dueDate: form.dueDate || null,
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
          }
        : { notes: form.notes };

      const response = await updateInvoice(id, payload);
      setInvoice(response.data.invoice);
      setForm(buildFormFromInvoice(response.data.invoice));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update invoice.');
    } finally {
      setSaving(false);
    }
  };

  const handleRecordPayment = async (payload) => {
    setPaying(true);
    setError('');

    try {
      const response = await recordPayment(id, payload);
      setInvoice(response.data.invoice);
      setForm(buildFormFromInvoice(response.data.invoice));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to record payment.');
    } finally {
      setPaying(false);
    }
  };

  const handleRecordRefund = async (event) => {
    event.preventDefault();
    setRefunding(true);
    setError('');
    setRefundMessage('');

    try {
      const response = await recordRefund(id, {
        amount: Number(refundForm.amount),
        reason: refundForm.reason.trim()
      });
      setInvoice(response.data.invoice);
      setForm(buildFormFromInvoice(response.data.invoice));
      setRefundForm({ amount: '', reason: '' });
      setRefundMessage('Refund recorded successfully.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to record refund.');
    } finally {
      setRefunding(false);
    }
  };

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);
    setError('');

    try {
      const response = await generateInvoicePdf(id);
      setInvoice(response.data.invoice);
      setForm(buildFormFromInvoice(response.data.invoice));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to generate invoice PDF.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    setError('');

    try {
      const response = await downloadInvoicePdf(id);
      const blob = new Blob([response.data], {
        type: response.headers['content-type'] || 'application/pdf'
      });
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const disposition = response.headers['content-disposition'] || '';
      const filenameMatch = disposition.match(/filename=\"?([^\"]+)\"?/i);

      link.href = objectUrl;
      link.download = filenameMatch?.[1] || `invoice-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(objectUrl);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to download invoice PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleRazorpayPayment = () => {
    navigate(`/billing/${id}/checkout`);
  };

  const handleCancel = async () => {
    const reason = window.prompt('Enter cancellation reason');

    if (!reason?.trim()) {
      return;
    }

    try {
      const response = await cancelInvoice(id, { reason: reason.trim() });
      setInvoice(response.data.invoice);
      setForm(buildFormFromInvoice(response.data.invoice));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to cancel invoice.');
    }
  };

  if (loading) {
    return <LoadingState label="Loading invoice..." />;
  }

  if (error && !invoice) {
    return <ErrorState title="Invoice unavailable" description={error} />;
  }

  if (!invoice) {
    return <ErrorState title="Invoice unavailable" description="No invoice was returned." />;
  }

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Invoice detail</p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-900">{invoice.invoiceNumber || 'Invoice'}</h1>
          <p className="mt-2 text-sm text-stone-600">Issued invoices remain visible to doctors and staff, but tax and item changes stay limited to drafts.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50" to="/billing">
            Back to billing
          </Link>
          {invoice.patientId?._id ? (
            <Link className="rounded-2xl border border-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50" to={`/patients/${invoice.patientId._id}`}>
              Open patient
            </Link>
          ) : null}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="rounded-2xl border border-sky-300 px-4 py-3 text-sm font-semibold text-sky-700 hover:bg-sky-50 disabled:bg-stone-100"
          >
            {downloadingPdf ? 'Preparing PDF...' : 'Download PDF'}
          </button>
          {canMutateBilling ? (
            <button
              type="button"
              onClick={handleGeneratePdf}
              disabled={generatingPdf}
              className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:bg-stone-100"
            >
              {generatingPdf ? 'Generating...' : 'Generate PDF'}
            </button>
          ) : null}
          {isAdmin && invoice.invoiceStatus !== 'cancelled' ? (
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-2xl border border-rose-300 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"
            >
              Cancel invoice
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <BillingSummaryCards
        summary={{
          totalRevenue: invoice.totalAmount,
          pendingAmount: invoice.dueAmount,
          paidInvoices: invoice.paymentStatus === 'paid' ? 1 : 0,
          unpaidInvoices: invoice.paymentStatus === 'unpaid' ? 1 : 0,
          todayRevenue: invoice.paidAmount
        }}
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-6">
          <InvoiceItemsTable
            items={form.items}
            editable={canMutateBilling && isDraft}
            onItemChange={handleItemChange}
            onAddItem={handleAddItem}
            onRemoveItem={handleRemoveItem}
          />

          <article className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
            <h2 className="text-xl font-semibold text-stone-900">Invoice settings</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-stone-700">
                <span>Due date</span>
                <input
                  className={FIELD_CLASS}
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
                  disabled={!canMutateBilling}
                />
              </label>

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
                  disabled={!canMutateBilling || !isDraft}
                />
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-stone-700">
                <span>Discount type</span>
                <select
                  className={FIELD_CLASS}
                  value={form.discountType}
                  onChange={(event) => setForm((current) => ({ ...current, discountType: event.target.value }))}
                  disabled={!canMutateBilling || !isDraft}
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
                  disabled={!canMutateBilling || !isDraft}
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm font-medium text-stone-700">
              <span>Notes</span>
              <textarea
                className={FIELD_CLASS}
                rows={4}
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                disabled={!canMutateBilling}
              />
            </label>

            {canMutateBilling ? (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-stone-300"
              >
                {saving ? 'Saving...' : isDraft ? 'Save invoice draft' : 'Save notes'}
              </button>
            ) : null}
          </article>
        </div>

        <div className="grid gap-6">
          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
            <h2 className="text-xl font-semibold text-stone-900">Invoice totals</h2>
            <dl className="mt-6 grid gap-3 text-sm text-stone-700">
              <div className="flex items-center justify-between">
                <dt>Subtotal</dt>
                <dd className="font-semibold text-stone-900">INR {preview.subtotal.toFixed(2)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Discount</dt>
                <dd className="font-semibold text-stone-900">INR {preview.discountAmount.toFixed(2)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>GST amount</dt>
                <dd className="font-semibold text-stone-900">INR {preview.gstAmount.toFixed(2)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Total</dt>
                <dd className="font-semibold text-stone-900">INR {preview.totalAmount.toFixed(2)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Paid</dt>
                <dd className="font-semibold text-stone-900">INR {Number(invoice.paidAmount || 0).toFixed(2)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Due</dt>
                <dd className="font-semibold text-stone-900">INR {Number(invoice.dueAmount || 0).toFixed(2)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Payment status</dt>
                <dd className="font-semibold text-stone-900">{invoice.paymentStatus || 'unpaid'}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Invoice status</dt>
                <dd className="font-semibold text-stone-900">{invoice.invoiceStatus || 'draft'}</dd>
              </div>
            </dl>
          </article>

          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
            <h2 className="text-xl font-semibold text-stone-900">Payment history</h2>
            {invoice.payments?.length ? (
              <ul className="mt-4 space-y-3 text-sm text-stone-700">
                {invoice.payments.map((payment) => (
                  <li key={payment._id || `${payment.paidAt}-${payment.amount}`} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                    <p className="font-semibold text-stone-900">
                      INR {Number(payment.amount || 0).toFixed(2)} via {payment.paymentMode || 'other'}
                    </p>
                    <p className="mt-1 text-stone-600">
                      {(payment.paidAt || '').slice?.(0, 10) || 'Not provided'}
                      {payment.transactionId ? ` | ${payment.transactionId}` : ''}
                    </p>
                    <p className="mt-1 text-stone-600">{payment.notes || 'No notes'}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-stone-600">No payments recorded yet.</p>
            )}
          </article>

          {canMutateBilling ? (
            <div className="grid gap-4">
              <PaymentForm
                dueAmount={invoice.dueAmount}
                onSubmit={handleRecordPayment}
                loading={paying}
                disabled={invoice.invoiceStatus === 'cancelled' || Number(invoice.dueAmount || 0) <= 0}
              />
              <button
                type="button"
                onClick={handleRazorpayPayment}
                disabled={razorpayLoading || invoice.invoiceStatus === 'cancelled' || Number(invoice.dueAmount || 0) <= 0}
                className="w-full rounded-2xl border-2 border-emerald-600 bg-white px-4 py-3 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-50 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:border-stone-300 disabled:bg-stone-100 disabled:text-stone-400"
              >
                {razorpayLoading ? 'Initiating Razorpay...' : 'Pay Online with Razorpay'}
              </button>

              {Number(invoice.paidAmount || 0) > 0 && invoice.invoiceStatus !== 'cancelled' ? (
                <form className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-5" onSubmit={handleRecordRefund}>
                  <h3 className="text-lg font-semibold text-stone-900">Record refund</h3>
                  <label className="grid gap-2 text-sm font-medium text-stone-700">
                    <span>Refund amount (INR)</span>
                    <input
                      className={FIELD_CLASS}
                      type="number"
                      min="0.01"
                      step="0.01"
                      max={Number(invoice.paidAmount || 0)}
                      value={refundForm.amount}
                      onChange={(event) => setRefundForm((current) => ({ ...current, amount: event.target.value }))}
                      required
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-stone-700">
                    <span>Reason</span>
                    <textarea
                      className={FIELD_CLASS}
                      rows={3}
                      value={refundForm.reason}
                      onChange={(event) => setRefundForm((current) => ({ ...current, reason: event.target.value }))}
                      required
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={refunding}
                    className="rounded-2xl border border-rose-300 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                  >
                    {refunding ? 'Recording refund...' : 'Record refund'}
                  </button>
                  {refundMessage ? <p className="text-sm text-emerald-700">{refundMessage}</p> : null}
                </form>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default InvoiceDetailPage;
