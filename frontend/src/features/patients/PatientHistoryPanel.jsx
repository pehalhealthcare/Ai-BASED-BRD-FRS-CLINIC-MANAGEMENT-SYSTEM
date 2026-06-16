import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import { patientApi } from '../../lib/api';
import PrescriptionPdfButton from '../prescriptions/PrescriptionPdfButton';

const summaryCards = [
  { key: 'totalAppointments', label: 'Appointments' },
  { key: 'totalConsultations', label: 'Consultations' },
  { key: 'totalPrescriptions', label: 'Prescriptions' },
  { key: 'totalLabOrders', label: 'Lab Orders' },
  { key: 'totalDispensings', label: 'Dispensings' },
  { key: 'totalInvoices', label: 'Invoices' },
  { key: 'totalNotifications', label: 'Notifications' },
  { key: 'totalFollowUps', label: 'Follow-ups' }
];

const renderAppointments = (items = []) => (
  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
    <h4 className="text-sm font-semibold text-stone-900">Appointments</h4>
    {items.length ? (
      <ul className="mt-3 space-y-2 text-sm text-stone-700">
        {items.map((item) => (
          <li key={item._id || `${item.date}-${item.status}`} className="rounded-xl border border-stone-200 bg-white px-3 py-2">
            {item.label || item.title || 'Appointment record'}
          </li>
        ))}
      </ul>
    ) : (
      <p className="mt-3 text-sm text-stone-600">No records yet.</p>
    )}
  </div>
);

const renderConsultations = (items = []) => (
  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
    <h4 className="text-sm font-semibold text-stone-900">Consultations</h4>
    {items.length ? (
      <ul className="mt-3 space-y-3 text-sm text-stone-700">
        {items.map((item) => (
          <li key={item._id} className="rounded-xl border border-stone-200 bg-white px-4 py-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-semibold text-stone-900">{item.chiefComplaint || 'Clinical consultation'}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-500">
                  {(item.date || '').slice?.(0, 10) || 'Not provided'} | {item.status || 'Not provided'}
                </p>
                <p className="mt-2 text-sm text-stone-600">
                  Diagnosis: {item.diagnosis?.primary || item.diagnosis?.notes || 'Not provided'}
                </p>
              </div>
              {item._id ? (
                <Link className="rounded-2xl border border-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50" to={`/consultations/${item._id}`}>
                  Open
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    ) : (
      <p className="mt-3 text-sm text-stone-600">No records yet.</p>
    )}
  </div>
);

const renderPrescriptions = (items = []) => (
  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
    <h4 className="text-sm font-semibold text-stone-900">Prescriptions</h4>
    {items.length ? (
      <ul className="mt-3 space-y-3 text-sm text-stone-700">
        {items.map((item) => (
          <li key={item._id} className="rounded-xl border border-stone-200 bg-white px-4 py-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-semibold text-stone-900">{item.prescriptionNumber || 'Prescription'}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-500">
                  {(item.date || '').slice?.(0, 10) || 'Not provided'} | {item.status || 'Not provided'}
                </p>
                <p className="mt-2 text-sm text-stone-600">
                  Diagnosis: {item.diagnosisSnapshot || 'Not provided'}
                </p>
                <p className="mt-1 text-sm text-stone-600">Advice: {item.advice || 'Not provided'}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link className="rounded-2xl border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50" to={`/prescriptions/${item._id}`}>
                  Open
                </Link>
                <PrescriptionPdfButton prescriptionId={item._id} disabled={item.status !== 'finalized'} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    ) : (
      <p className="mt-3 text-sm text-stone-600">No records yet.</p>
    )}
  </div>
);

const renderInvoices = (items = []) => (
  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
    <h4 className="text-sm font-semibold text-stone-900">Invoices</h4>
    {items.length ? (
      <ul className="mt-3 space-y-3 text-sm text-stone-700">
        {items.map((item) => (
          <li key={item._id || `${item.invoiceNumber}-${item.paymentStatus}`} className="rounded-xl border border-stone-200 bg-white px-4 py-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-semibold text-stone-900">{item.invoiceNumber || 'Invoice'}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-500">
                  {(item.date || '').slice?.(0, 10) || 'Not provided'} | {item.paymentStatus || 'Not provided'}
                </p>
                <p className="mt-2 text-sm text-stone-600">
                  Total: INR {Number(item.totalAmount || 0).toFixed(2)} | Due: INR {Number(item.dueAmount || 0).toFixed(2)}
                </p>
              </div>
              {item._id ? (
                <Link className="rounded-2xl border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50" to={`/billing/${item._id}`}>
                  Open
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    ) : (
      <p className="mt-3 text-sm text-stone-600">No records yet.</p>
    )}
  </div>
);

const renderLabs = (items = []) => (
  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
    <h4 className="text-sm font-semibold text-stone-900">Lab orders</h4>
    {items.length ? (
      <ul className="mt-3 space-y-3 text-sm text-stone-700">
        {items.map((item) => (
          <li key={item._id || item.orderNumber} className="rounded-xl border border-stone-200 bg-white px-4 py-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-semibold text-stone-900">{item.orderNumber || 'Lab order'}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-500">
                  {(item.orderedAt || '').slice?.(0, 10) || 'Not provided'} | {item.status || 'Not provided'}
                </p>
                <p className="mt-2 text-sm text-stone-600">
                  Tests: {(item.tests || []).map((test) => test.name || test.code).join(', ') || 'Not provided'}
                </p>
                <p className="mt-1 text-sm text-stone-600">
                  Report: {item.report ? `${item.report.status || 'draft'} (${item.report.abnormalCount || 0} abnormal)` : 'Pending'}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {item._id ? (
                  <Link className="rounded-2xl border border-cyan-300 px-3 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-50" to={`/labs/orders/${item._id}`}>
                    Open order
                  </Link>
                ) : null}
                {item.report?._id ? (
                  <Link className="rounded-2xl border border-violet-300 px-3 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50" to={`/labs/reports/${item.report._id}`}>
                    Open report
                  </Link>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    ) : (
      <p className="mt-3 text-sm text-stone-600">No records yet.</p>
    )}
  </div>
);

const renderDispensings = (items = []) => (
  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
    <h4 className="text-sm font-semibold text-stone-900">Pharmacy</h4>
    {items.length ? (
      <ul className="mt-3 space-y-3 text-sm text-stone-700">
        {items.map((item) => (
          <li key={item._id || `${item.date}-${item.status}`} className="rounded-xl border border-stone-200 bg-white px-4 py-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="font-semibold text-stone-900">{item.prescription?.prescriptionNumber || 'Dispensing record'}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-500">
                  {(item.date || '').slice?.(0, 10) || 'Not provided'} | {item.status || 'Not provided'}
                </p>
                <p className="mt-2 text-sm text-stone-600">
                  Medicines: {(item.items || []).map((recordItem) => recordItem.medicineName).join(', ') || 'Not provided'}
                </p>
                <p className="mt-1 text-sm text-stone-600">
                  Sale: INR {Number(item.sale?.amount || item.subtotal || 0).toFixed(2)} | Payment {item.sale?.paymentStatus || 'pending'}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {item._id ? (
                  <Link className="rounded-2xl border border-indigo-300 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50" to={`/pharmacy/dispensings/${item._id}`}>
                    Open dispensing
                  </Link>
                ) : null}
                {item.prescription?._id ? (
                  <Link className="rounded-2xl border border-emerald-300 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50" to={`/prescriptions/${item.prescription._id}`}>
                    Open prescription
                  </Link>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    ) : (
      <p className="mt-3 text-sm text-stone-600">No records yet.</p>
    )}
  </div>
);

const renderNotifications = (items = []) => (
  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
    <h4 className="text-sm font-semibold text-stone-900">Notifications</h4>
    {items.length ? (
      <ul className="mt-3 space-y-3 text-sm text-stone-700">
        {items.map((item) => (
          <li key={item._id || `${item.type}-${item.createdAt}`} className="rounded-xl border border-stone-200 bg-white px-4 py-3">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700">
                  {item.type?.replaceAll('_', ' ') || 'notification'}
                </span>
                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                  {item.channel || 'mock'}
                </span>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                  {item.status || 'pending'}
                </span>
              </div>
              <p className="font-semibold text-stone-900">{item.subject || 'Notification'}</p>
              <p className="text-sm text-stone-600">{item.body || 'No message body recorded.'}</p>
              <p className="text-xs uppercase tracking-[0.16em] text-stone-500">
                {(item.sentAt || item.scheduledFor || item.createdAt || '').slice?.(0, 16).replace('T', ' ') || 'Not provided'}
              </p>
            </div>
          </li>
        ))}
      </ul>
    ) : (
      <p className="mt-3 text-sm text-stone-600">No records yet.</p>
    )}
  </div>
);

const renderFollowUps = (items = []) => (
  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
    <h4 className="text-sm font-semibold text-stone-900">Follow-up tasks</h4>
    {items.length ? (
      <ul className="mt-3 space-y-3 text-sm text-stone-700">
        {items.map((item) => (
          <li key={item._id || `${item.title}-${item.dueDate}`} className="rounded-xl border border-stone-200 bg-white px-4 py-3">
            <p className="font-semibold text-stone-900">{item.title || 'Follow-up task'}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-500">
              {(item.dueDate || '').slice?.(0, 10) || 'Not provided'} | {item.status || 'pending'}
            </p>
            <p className="mt-2 text-sm text-stone-600">{item.description || 'No description provided.'}</p>
            <p className="mt-1 text-sm text-stone-600">
              Reminder sent: {item.reminderSent ? 'Yes' : 'No'}
            </p>
          </li>
        ))}
      </ul>
    ) : (
      <p className="mt-3 text-sm text-stone-600">No records yet.</p>
    )}
  </div>
);

const PatientHistoryPanel = ({ patientId }) => {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadHistory = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await patientApi.history(patientId);

        if (isMounted) {
          setHistory(response.data);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load patient history.');
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
    return <LoadingState label="Loading patient history..." />;
  }

  if (error) {
    return <ErrorState title="History unavailable" description={error} />;
  }

  if (!history) {
    return <EmptyState title="No history found" description="No records found for this patient yet." />;
  }

  return (
    <section className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-8">
        {summaryCards.map((card) => (
          <div key={card.key} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/40">
            <p className="text-xs uppercase tracking-[0.18em] text-stone-500">{card.label}</p>
            <p className="mt-3 text-2xl font-semibold text-stone-900">{history.summary?.[card.key] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {renderAppointments(history.appointments || [])}
        {renderConsultations(history.consultations || [])}
        {renderPrescriptions(history.prescriptions || [])}
        {renderLabs(history.labs || [])}
        {renderDispensings(history.dispensings || [])}
        {renderInvoices(history.invoices || [])}
        {renderNotifications(history.notifications || [])}
        {renderFollowUps(history.followUps || [])}
      </div>
    </section>
  );
};

export default PatientHistoryPanel;
