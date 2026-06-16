import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import EmptyState from '../../components/common/EmptyState';
import LoadingState from '../../components/common/LoadingState';
import BillingSummaryCards from '../billing/BillingSummaryCards';
import { getBillingSummary } from '../billing/billing.api';

const BillingStatsWidget = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadSummary = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await getBillingSummary();

        if (isMounted) {
          setSummary(response.data || {});
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load billing summary.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadSummary();

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <LoadingState label="Loading billing summary..." />;
  }

  if (error) {
    return <EmptyState title="Billing summary unavailable" description={error} />;
  }

  return (
    <section className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Billing</p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-900">Revenue snapshot</h2>
        </div>
        <Link className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50" to="/billing">
          Open billing
        </Link>
      </div>
      <BillingSummaryCards summary={summary || {}} />
    </section>
  );
};

export default BillingStatsWidget;
