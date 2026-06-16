import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import PageHeader from '../../components/layout/PageHeader';
import DispensingStatusBadge from './DispensingStatusBadge';
import { getDispensing } from './pharmacyApi';

const DispensingDetailPage = () => {
  const { id } = useParams();
  const [record, setRecord] = useState(null);
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadRecord = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await getDispensing(id);

        if (isMounted) {
          setRecord(response.data.dispensingRecord);
          setSale(response.data.pharmacySale);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load dispensing record.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadRecord();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return <LoadingState label="Loading dispensing detail..." />;
  }

  if (error || !record) {
    return <ErrorState title="Dispensing record unavailable" description={error || 'No dispensing record found.'} />;
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Phase 12"
        title={record.prescriptionId?.prescriptionNumber || 'Dispensing detail'}
        description="Review dispensed items, allocated batches, and linked pharmacy sale details."
        actions={
          <>
            <Link className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50" to="/pharmacy/dispensings">
              Back to dispensings
            </Link>
            {record.patientId?._id ? (
              <Link className="rounded-2xl border border-cyan-300 px-4 py-3 text-sm font-semibold text-cyan-700 hover:bg-cyan-50" to={`/patients/${record.patientId._id}/medicines`}>
                Patient medicine history
              </Link>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <article className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
          <div className="flex flex-wrap items-center gap-3">
            <DispensingStatusBadge status={record.status} />
          </div>
          <div className="grid gap-3 text-sm text-stone-700">
            <p><span className="font-semibold text-stone-900">Patient:</span> {record.patientId?.fullName || 'Not provided'}</p>
            <p><span className="font-semibold text-stone-900">Doctor:</span> {record.doctorId?.fullName || 'Not provided'}</p>
            <p><span className="font-semibold text-stone-900">Dispensed by:</span> {record.dispensedBy?.name || 'Not provided'}</p>
            <p><span className="font-semibold text-stone-900">Dispensed at:</span> {(record.dispensedAt || '').slice?.(0, 10) || 'Not provided'}</p>
            <p><span className="font-semibold text-stone-900">Subtotal:</span> INR {Number(record.subtotal || 0).toFixed(2)}</p>
            <p><span className="font-semibold text-stone-900">Notes:</span> {record.notes || 'Not provided'}</p>
          </div>
        </article>

        <div className="grid gap-6">
          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
            <h2 className="text-xl font-semibold text-stone-900">Dispensed items</h2>
            <div className="mt-5 grid gap-3">
              {(record.items || []).map((item, index) => (
                <div key={`${item.batchNumber}-${index}`} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                  <p className="font-semibold text-stone-900">{item.medicineName}</p>
                  <p className="mt-1 text-sm text-stone-600">
                    Batch {item.batchNumber} | Qty {item.quantity} | Unit INR {Number(item.unitPrice || 0).toFixed(2)}
                  </p>
                  <p className="mt-1 text-sm text-stone-600">
                    Total INR {Number(item.totalPrice || 0).toFixed(2)} | {item.instructions || 'No instructions'}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
            <h2 className="text-xl font-semibold text-stone-900">Sale summary</h2>
            <p className="mt-2 text-sm text-stone-600">
              Amount: INR {Number(sale?.amount || 0).toFixed(2)} | Payment status: {sale?.paymentStatus || 'pending'}
            </p>
            <p className="mt-1 text-sm text-stone-600">
              Payment method: {sale?.paymentMethod || 'Not recorded'} | Invoice: {sale?.invoiceId?.invoiceNumber || 'Not linked'}
            </p>
          </article>
        </div>
      </div>
    </section>
  );
};

export default DispensingDetailPage;
