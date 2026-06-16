import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import { getPatientInvoices } from '../billing/billing.api';

const PatientInvoiceHistory = ({ patientId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    let isMounted = true;

    const loadInvoices = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await getPatientInvoices(patientId, { limit: 20 });

        if (isMounted) {
          setInvoices(response.data.invoices || []);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load patient invoices.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (patientId) {
      loadInvoices();
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [patientId]);

  if (loading) {
    return <LoadingState label="Loading patient invoices..." />;
  }

  if (error) {
    return <ErrorState title="Invoices unavailable" description={error} />;
  }

  if (!invoices.length) {
    return <EmptyState title="No invoices yet" description="No billing records have been created for this patient yet." />;
  }

  return (
    <div className="grid gap-3">
      {invoices.map((invoice) => (
        <article key={invoice._id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-semibold text-stone-900">{invoice.invoiceNumber || 'Invoice'}</p>
              <p className="mt-1 text-sm text-stone-600">
                {(invoice.invoiceDate || '').slice?.(0, 10) || 'Not provided'} | {invoice.paymentStatus || 'Not provided'}
              </p>
              <p className="mt-1 text-sm text-stone-600">
                Total: INR {Number(invoice.totalAmount || 0).toFixed(2)} | Due: INR {Number(invoice.dueAmount || 0).toFixed(2)}
              </p>
            </div>
            <Link className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50" to={`/billing/${invoice._id}`}>
              View invoice
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
};

export default PatientInvoiceHistory;
