import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import PrescriptionPdfButton from './PrescriptionPdfButton';
import { getPrescriptionsByConsultation, getPrescriptionsByPatient } from './prescriptionApi';

const PrescriptionListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const patientId = searchParams.get('patientId') || '';
  const consultationId = searchParams.get('consultationId') || '';
  const status = searchParams.get('status') || '';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [records, setRecords] = useState([]);
  const [contextTitle, setContextTitle] = useState('Prescriptions');

  useEffect(() => {
    let isMounted = true;

    const loadRecords = async () => {
      if (!patientId && !consultationId) {
        setRecords([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        if (consultationId) {
          const response = await getPrescriptionsByConsultation(consultationId);

          if (isMounted) {
            setRecords(response.data.prescriptions || []);
            setContextTitle('Consultation prescriptions');
          }
        } else {
          const response = await getPrescriptionsByPatient(patientId, status ? { status } : {});

          if (isMounted) {
            setRecords(response.data.prescriptions || []);
            setContextTitle(`Patient prescriptions${response.data.patient?.fullName ? ` for ${response.data.patient.fullName}` : ''}`);
          }
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load prescriptions.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadRecords();

    return () => {
      isMounted = false;
    };
  }, [consultationId, patientId, status]);

  if (loading) {
    return <LoadingState label="Loading prescriptions..." />;
  }

  if (error) {
    return <ErrorState title="Prescriptions unavailable" description={error} />;
  }

  if (!patientId && !consultationId) {
    return (
      <EmptyState
        title="No prescription context selected"
        description="Open this page with a patientId or consultationId query parameter to review prescriptions."
      />
    );
  }

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Prescription list</p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-900">{contextTitle}</h1>
        </div>
        {patientId ? (
          <select
            value={status}
            onChange={(event) => {
              const next = new URLSearchParams(searchParams);

              if (event.target.value) {
                next.set('status', event.target.value);
              } else {
                next.delete('status');
              }

              setSearchParams(next);
            }}
            className="rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="finalized">Finalized</option>
            <option value="cancelled">Cancelled</option>
          </select>
        ) : null}
      </div>

      {!records.length ? (
        <EmptyState title="No prescriptions found" description="No prescription records match this context yet." />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-lg shadow-stone-200/40">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200">
              <thead className="bg-stone-50">
                <tr className="text-left text-xs uppercase tracking-[0.18em] text-stone-500">
                  <th className="px-6 py-4">Number</th>
                  <th className="px-6 py-4">Patient</th>
                  <th className="px-6 py-4">Doctor</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {records.map((item) => (
                  <tr key={item._id} className="align-top text-sm text-stone-700">
                    <td className="px-6 py-4 font-semibold text-stone-900">{item.prescriptionNumber || 'Not provided'}</td>
                    <td className="px-6 py-4">{item.patientId?.fullName || 'Not provided'}</td>
                    <td className="px-6 py-4">{item.doctorId?.fullName || 'Not provided'}</td>
                    <td className="px-6 py-4">{item.status || 'Not provided'}</td>
                    <td className="px-6 py-4">{(item.finalizedAt || item.createdAt || '').slice?.(0, 10) || 'Not provided'}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-3">
                        <Link className="rounded-2xl border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50" to={`/prescriptions/${item._id}`}>
                          View
                        </Link>
                        <PrescriptionPdfButton prescriptionId={item._id} disabled={item.status !== 'finalized'} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};

export default PrescriptionListPage;
