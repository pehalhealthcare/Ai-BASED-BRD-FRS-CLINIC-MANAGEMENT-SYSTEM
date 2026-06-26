import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import Badge from '../../components/common/Badge';
import PageHeader from '../../components/layout/PageHeader';
import { ADMIN_ROLES, ROLES } from '../../constants/roles';
import useAuth from '../../hooks/useAuth';
import { listLabOrders } from './labApi';

const FIELD_CLASS =
  'w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 text-white';

const getStatusTone = (status = '') => {
  if (status === 'completed') {
    return 'success';
  }

  if (status === 'cancelled') {
    return 'danger';
  }

  if (status === 'processing' || status === 'sample_collected') {
    return 'warning';
  }

  return 'info';
};

const LabOrdersPage = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    status: '',
    from: '',
    to: ''
  });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadOrders = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await listLabOrders({
          limit: 20,
          ...(filters.status ? { status: filters.status } : {}),
          ...(filters.from ? { from: filters.from } : {}),
          ...(filters.to ? { to: filters.to } : {})
        });

        if (isMounted) {
          setOrders(response.data.labOrders || []);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load lab orders.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, [filters.from, filters.status, filters.to]);

  if (loading) {
    return <LoadingState label="Loading lab orders..." />;
  }

  if (error && !orders.length) {
    return <ErrorState title="Lab orders unavailable" description={error} />;
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Phase 11"
        title="Lab orders"
        description="Track clinic-scoped lab order progress from ordered to completed, including linked reports and abnormal result counts."
        actions={
          <>
            {ADMIN_ROLES.includes(user?.role) ? (
              <Link className="rounded-2xl border border-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50" to="/labs/tests">
                Manage catalog
              </Link>
            ) : null}
            {user?.role === ROLES.DOCTOR ? (
              <Link className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50" to="/consultations">
                Open consultations
              </Link>
            ) : null}
          </>
        }
      />

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <div className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium text-stone-700">
          <span>Status</span>
          <select className={FIELD_CLASS} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
            <option value="">All statuses</option>
            <option value="ordered">Ordered</option>
            <option value="sample_collected">Sample collected</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
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

      {!orders.length ? (
        <EmptyState title="No lab orders found" description="Create a consultation-linked lab order to begin the lab workflow." />
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <article key={order._id} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/40">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-semibold text-stone-900">{order.orderNumber || 'Lab order'}</h2>
                    <Badge tone={getStatusTone(order.status)}>{String(order.status || 'ordered').replaceAll('_', ' ')}</Badge>
                    <Badge tone={order.priority === 'urgent' ? 'danger' : 'info'}>{order.priority || 'routine'}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-stone-600">
                    Patient: {order.patientId?.fullName || 'Not provided'} | Doctor: {order.doctorId?.fullName || 'Not provided'}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    Ordered: {(order.orderedAt || '').slice?.(0, 10) || 'Not provided'} | Tests: {(order.tests || []).map((test) => test.name || test.code).join(', ') || 'Not provided'}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    Report: {order.report ? `${order.report.status || 'draft'} (${order.report.abnormalCount || 0} abnormal)` : 'Pending'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link className="rounded-2xl border border-cyan-300 px-4 py-3 text-sm font-semibold text-cyan-700 hover:bg-cyan-50" to={`/labs/orders/${order._id}`}>
                    Open order
                  </Link>
                  {order.report?._id ? (
                    <Link className="rounded-2xl border border-violet-300 px-4 py-3 text-sm font-semibold text-violet-700 hover:bg-violet-50" to={`/labs/reports/${order.report._id}`}>
                      Open report
                    </Link>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default LabOrdersPage;
