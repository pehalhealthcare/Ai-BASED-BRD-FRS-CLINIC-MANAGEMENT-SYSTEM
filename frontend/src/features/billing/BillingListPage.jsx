import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import { getCurrentUserFromStorage } from '../../lib/auth';
import BillingSummaryCards from './BillingSummaryCards';
import { getBillingSummary, getInvoices } from './billing.api';

const BillingListPage = () => {
  const currentUser = getCurrentUserFromStorage();
  const canManageBilling =
    currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'RECEPTIONIST';
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState(null);

  const filters = {
    search: searchParams.get('search') || '',
    patientId: searchParams.get('patientId') || '',
    paymentStatus: searchParams.get('paymentStatus') || '',
    fromDate: searchParams.get('fromDate') || '',
    toDate: searchParams.get('toDate') || ''
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      setError('');

      try {
        const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
        const [invoiceResponse, summaryResponse] = await Promise.allSettled([
          getInvoices(params),
          canManageBilling ? getBillingSummary() : Promise.resolve({ data: null })
        ]);

        if (!isMounted) {
          return;
        }

        if (invoiceResponse.status === 'rejected') {
          throw invoiceResponse.reason;
        }

        setInvoices(invoiceResponse.value.data.invoices || []);
        setPagination(invoiceResponse.value.data.pagination || null);
        setSummary(
          summaryResponse.status === 'fulfilled'
            ? summaryResponse.value.data || null
            : null
        );
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load billing data.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [searchParams, canManageBilling]);

  const updateFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);

    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }

    setSearchParams(next);
  };

  if (loading) {
    return <LoadingState label="Loading billing dashboard..." />;
  }

  if (error) {
    return <ErrorState title="Billing unavailable" description={error} />;
  }

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Phase 8</p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-900">Billing workspace</h1>
          <p className="mt-2 text-sm text-stone-600">Track invoice creation, payments, GST-inclusive totals, PDF generation, and patient-linked billing history.</p>
        </div>
        {canManageBilling ? (
          <Link className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700" to="/billing/create">
            Create invoice
          </Link>
        ) : null}
      </div>

      {summary ? <BillingSummaryCards summary={summary || {}} /> : null}

      <div className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 lg:grid-cols-4">
        <input
          className="rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          type="text"
          placeholder="Search invoice or patient"
          value={filters.search}
          onChange={(event) => updateFilter('search', event.target.value)}
        />
        <select
          className="rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          value={filters.paymentStatus}
          onChange={(event) => updateFilter('paymentStatus', event.target.value)}
        >
          <option value="">All payment statuses</option>
          <option value="unpaid">Unpaid</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input
          className="rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          type="date"
          value={filters.fromDate}
          onChange={(event) => updateFilter('fromDate', event.target.value)}
        />
        <input
          className="rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          type="date"
          value={filters.toDate}
          onChange={(event) => updateFilter('toDate', event.target.value)}
        />
      </div>

      {filters.patientId ? (
        <p className="text-sm text-stone-600">
          Filtering invoices for the selected patient record.
        </p>
      ) : null}

      {!invoices.length ? (
        <EmptyState title="No invoices found" description="No invoice records match the current filters yet." />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-lg shadow-stone-200/40">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200">
              <thead className="bg-stone-50">
                <tr className="text-left text-xs uppercase tracking-[0.18em] text-stone-500">
                  <th className="px-6 py-4">Invoice</th>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4">Paid</th>
                  <th className="px-6 py-4">Due</th>
                  <th className="px-6 py-4">Payment status</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
                {invoices.map((invoice) => (
                  <tr key={invoice._id}>
                    <td className="px-6 py-4 font-semibold text-stone-900">{invoice.invoiceNumber || 'Not provided'}</td>
                    <td className="px-6 py-4">{invoice.patientId?.fullName || 'Not provided'}</td>
                    <td className="px-6 py-4">INR {Number(invoice.totalAmount || 0).toFixed(2)}</td>
                    <td className="px-6 py-4">INR {Number(invoice.paidAmount || 0).toFixed(2)}</td>
                    <td className="px-6 py-4">INR {Number(invoice.dueAmount || 0).toFixed(2)}</td>
                    <td className="px-6 py-4">{invoice.paymentStatus || 'Not provided'}</td>
                    <td className="px-6 py-4">{(invoice.invoiceDate || '').slice?.(0, 10) || 'Not provided'}</td>
                    <td className="px-6 py-4">
                      <Link className="rounded-2xl border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50" to={`/billing/${invoice._id}`}>
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pagination ? (
        <p className="text-sm text-stone-600">
          Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} invoices)
        </p>
      ) : null}
    </section>
  );
};

export default BillingListPage;
