import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import Badge from '../../components/common/Badge';
import { getPatientLabHistory } from './labApi';

const getStatusTone = (status = '') => {
  if (status === 'completed' || status === 'finalized') {
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

const LabHistoryPanel = ({ patientId }) => {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadHistory = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await getPatientLabHistory(patientId, { limit: 20 });

        if (isMounted) {
          setHistory(response.data);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load lab history.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [patientId]);

  if (loading) {
    return <LoadingState label="Loading lab history..." />;
  }

  if (error) {
    return <ErrorState title="Lab history unavailable" description={error} />;
  }

  if (!history?.labOrders?.length) {
    return <EmptyState title="No lab orders found" description="This patient does not have any clinic-scoped lab orders yet." />;
  }

  return (
    <div className="grid gap-4">
      {history.labOrders.map((order) => (
        <article key={order._id} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/40">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-lg font-semibold text-stone-900">{order.orderNumber || 'Lab order'}</h3>
                <Badge tone={getStatusTone(order.status)}>{String(order.status || 'ordered').replaceAll('_', ' ')}</Badge>
                <Badge tone={order.priority === 'urgent' ? 'danger' : 'info'}>{order.priority || 'routine'}</Badge>
              </div>
              <p className="mt-2 text-sm text-stone-600">
                Ordered on {(order.orderedAt || '').slice?.(0, 10) || 'Not provided'} by {order.doctor?.fullName || 'Doctor not provided'}
              </p>
              <p className="mt-2 text-sm text-stone-600">
                Tests: {(order.tests || []).map((test) => test.name || test.code).join(', ') || 'Not provided'}
              </p>
              <p className="mt-1 text-sm text-stone-600">
                Report: {order.report ? `${order.report.status || 'draft'} with ${order.report.abnormalCount || 0} abnormal parameter(s)` : 'Pending'}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                className="rounded-2xl border border-cyan-300 px-4 py-3 text-sm font-semibold text-cyan-700 hover:bg-cyan-50"
                to={`/labs/orders/${order._id}`}
              >
                Open order
              </Link>
              {order.report?._id ? (
                <Link
                  className="rounded-2xl border border-violet-300 px-4 py-3 text-sm font-semibold text-violet-700 hover:bg-violet-50"
                  to={`/labs/reports/${order.report._id}`}
                >
                  Open report
                </Link>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
};

export default LabHistoryPanel;
