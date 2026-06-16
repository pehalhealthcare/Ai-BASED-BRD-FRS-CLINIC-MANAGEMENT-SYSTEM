import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import Badge from '../../components/common/Badge';
import PageHeader from '../../components/layout/PageHeader';
import { ADMIN_ROLES, ROLES } from '../../constants/roles';
import useAuth from '../../hooks/useAuth';
import { createLabReport, getLabOrder, updateLabOrderStatus } from './labApi';

const statusTransitions = {
  ordered: ['sample_collected', 'cancelled'],
  sample_collected: ['processing', 'cancelled'],
  processing: ['completed', 'cancelled']
};

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

const LabOrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState('');

  const canManageOrder = [ROLES.DOCTOR, ROLES.LAB_TECHNICIAN, ...ADMIN_ROLES].includes(user?.role);

  const loadOrder = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await getLabOrder(id);
      setOrder(response.data.labOrder);
      setReport(response.data.report);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load the lab order.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  const handleStatusChange = async (status) => {
    setStatusLoading(true);
    setError('');

    try {
      const response = await updateLabOrderStatus(id, { status });
      setOrder(response.data.labOrder);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update the lab order status.');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleCreateReport = async () => {
    setReportLoading(true);
    setError('');

    try {
      const response = await createLabReport({
        labOrderId: order._id,
        reportFileName: '',
        reportUrl: '',
        resultEntries: []
      });

      navigate(`/labs/reports/${response.data.labReport._id}`, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create a draft lab report.');
    } finally {
      setReportLoading(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading lab order..." />;
  }

  if (error && !order) {
    return <ErrorState title="Lab order unavailable" description={error} />;
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Phase 11"
        title={order?.orderNumber || 'Lab order'}
        description="Review the order snapshot, progress the lab workflow, and create or open the linked report."
        actions={
          <>
            <Link className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50" to="/labs/orders">
              Back to orders
            </Link>
            {report?._id ? (
              <Link className="rounded-2xl border border-violet-300 px-4 py-3 text-sm font-semibold text-violet-700 hover:bg-violet-50" to={`/labs/reports/${report._id}`}>
                Open report
              </Link>
            ) : canManageOrder && order?.status !== 'cancelled' ? (
              <button
                type="button"
                onClick={handleCreateReport}
                disabled={reportLoading}
                className="rounded-2xl border border-violet-300 px-4 py-3 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:border-stone-300 disabled:text-stone-400"
              >
                {reportLoading ? 'Creating report...' : 'Create draft report'}
              </button>
            ) : null}
          </>
        }
      />

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <article className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={getStatusTone(order?.status)}>{String(order?.status || 'ordered').replaceAll('_', ' ')}</Badge>
            <Badge tone={order?.priority === 'urgent' ? 'danger' : 'info'}>{order?.priority || 'routine'}</Badge>
          </div>

          <div className="grid gap-3 text-sm text-stone-700">
            <p><span className="font-semibold text-stone-900">Patient:</span> {order?.patientId?.fullName || 'Not provided'}</p>
            <p><span className="font-semibold text-stone-900">Doctor:</span> {order?.doctorId?.fullName || 'Not provided'}</p>
            <p><span className="font-semibold text-stone-900">Consultation:</span> {order?.consultationId?._id || 'Not provided'}</p>
            <p><span className="font-semibold text-stone-900">Ordered at:</span> {(order?.orderedAt || '').slice?.(0, 10) || 'Not provided'}</p>
            <p><span className="font-semibold text-stone-900">Notes:</span> {order?.notes || 'Not provided'}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {order?.patientId?._id ? (
              <Link className="rounded-2xl border border-cyan-300 px-4 py-3 text-sm font-semibold text-cyan-700 hover:bg-cyan-50" to={`/patients/${order.patientId._id}/labs`}>
                Patient lab history
              </Link>
            ) : null}
            {order?.consultationId?._id ? (
              <Link className="rounded-2xl border border-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50" to={`/consultations/${order.consultationId._id}`}>
                Open consultation
              </Link>
            ) : null}
          </div>
        </article>

        <div className="grid gap-6">
          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-stone-900">Ordered tests</h2>
                <p className="mt-2 text-sm text-stone-600">Each item keeps a snapshot of code, category, specimen type, and current test-level status.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              {(order?.tests || []).map((test) => (
                <div key={test._id || `${test.code}-${test.name}`} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-semibold text-stone-900">{test.name}</p>
                      <p className="mt-1 text-sm text-stone-600">
                        {test.code} | {test.category || 'Category not provided'} | {test.specimenType || 'Specimen not provided'}
                      </p>
                    </div>
                    <Badge tone={getStatusTone(test.status)}>{String(test.status || 'ordered').replaceAll('_', ' ')}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </article>

          {canManageOrder && statusTransitions[order?.status]?.length ? (
            <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
              <h2 className="text-xl font-semibold text-stone-900">Progress order status</h2>
              <p className="mt-2 text-sm text-stone-600">Only valid backend-supported status transitions are shown here.</p>
              <div className="mt-5 flex flex-wrap gap-3">
                {statusTransitions[order?.status].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => handleStatusChange(status)}
                    disabled={statusLoading}
                    className="rounded-2xl border border-amber-300 px-4 py-3 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:border-stone-300 disabled:text-stone-400"
                  >
                    {statusLoading ? 'Updating...' : `Mark ${status.replaceAll('_', ' ')}`}
                  </button>
                ))}
              </div>
            </article>
          ) : null}

          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
            <h2 className="text-xl font-semibold text-stone-900">Report status</h2>
            <p className="mt-2 text-sm text-stone-600">
              {report
                ? `Report ${report.status || 'draft'} with ${(report.resultEntries || []).filter((entry) => entry.isAbnormal).length} abnormal parameter(s).`
                : 'No report created yet for this order.'}
            </p>
          </article>
        </div>
      </div>
    </section>
  );
};

export default LabOrderDetailPage;
