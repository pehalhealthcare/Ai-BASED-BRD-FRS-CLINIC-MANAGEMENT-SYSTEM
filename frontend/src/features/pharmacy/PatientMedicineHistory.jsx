import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import PageHeader from '../../components/layout/PageHeader';
import { getPatientMedicineHistory } from './pharmacyApi';
import DispensingStatusBadge from './DispensingStatusBadge';

const PatientMedicineHistory = () => {
  const { patientId } = useParams();
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadHistory = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await getPatientMedicineHistory(patientId, { limit: 20 });

        if (isMounted) {
          setHistory(response.data);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load patient medicine history.');
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
    return <LoadingState label="Loading patient medicine history..." />;
  }

  if (error) {
    return <ErrorState title="Patient medicine history unavailable" description={error} />;
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Phase 12"
        title="Patient medicine history"
        description="Review dispensed medicines, linked prescriptions, and sale summaries in one patient-scoped view."
        actions={
          <>
            <Link className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50" to={`/patients/${patientId}`}>
              Back to patient
            </Link>
          </>
        }
      />

      {!history?.dispensingRecords?.length ? (
        <EmptyState title="No medicine history found" description="This patient does not have any dispensing records yet." />
      ) : (
        <div className="grid gap-4">
          {history.dispensingRecords.map((record) => (
            <article key={record._id} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm shadow-stone-200/40">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-semibold text-stone-900">
                      {record.prescriptionId?.prescriptionNumber || 'Dispensing record'}
                    </h2>
                    <DispensingStatusBadge status={record.status} />
                  </div>
                  <p className="mt-2 text-sm text-stone-600">
                    {(record.dispensedAt || '').slice?.(0, 10) || 'Not provided'} | Sale INR {Number(record.pharmacySale?.amount || record.subtotal || 0).toFixed(2)}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    Medicines: {(record.items || []).map((item) => `${item.medicineName} x${item.quantity}`).join(', ') || 'Not provided'}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    Payment: {record.pharmacySale?.paymentStatus || 'pending'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link className="rounded-2xl border border-cyan-300 px-4 py-3 text-sm font-semibold text-cyan-700 hover:bg-cyan-50" to={`/pharmacy/dispensings/${record._id}`}>
                    Open dispensing
                  </Link>
                  {record.prescriptionId?._id ? (
                    <Link className="rounded-2xl border border-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50" to={`/prescriptions/${record.prescriptionId._id}`}>
                      Open prescription
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

export default PatientMedicineHistory;
