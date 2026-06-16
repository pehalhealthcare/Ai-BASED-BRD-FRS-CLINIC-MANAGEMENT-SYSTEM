import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import { patientApi } from '../../lib/api';
import PatientInvoiceHistory from './PatientInvoiceHistory';
import PatientHistoryPanel from './PatientHistoryPanel';

const DetailItem = ({ label, value }) => (
  <div className="rounded-2xl bg-stone-50 p-4">
    <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">{label}</dt>
    <dd className="mt-2 text-sm font-medium text-stone-900">{value || 'Not provided'}</dd>
  </div>
);

const PatientDetailPage = () => {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadPatient = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await patientApi.get(id);

        if (isMounted) {
          setPatient(response.data.patient);
          setSummary(response.data.summary);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load patient.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPatient();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return <LoadingState label="Loading patient profile..." />;
  }

  if (error || !patient) {
    return <ErrorState title="Patient unavailable" description={error || 'No patient found.'} />;
  }

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Patient profile</p>
          <h2 className="mt-2 text-3xl font-semibold text-stone-900">{patient.fullName || 'Not provided'}</h2>
          <p className="mt-2 text-sm text-stone-600">Patient ID: {patient.patientId || 'Not provided'}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
            to="/patients"
          >
            Back to list
          </Link>
          <Link
            className="rounded-2xl border border-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            to={`/patients/${patient._id}/history`}
          >
            Consultation history
          </Link>
          <Link
            className="rounded-2xl border border-sky-300 px-4 py-3 text-sm font-semibold text-sky-700 transition hover:bg-sky-50"
            to={`/prescriptions?patientId=${patient._id}`}
          >
            Prescriptions
          </Link>
          <Link
            className="rounded-2xl border border-amber-300 px-4 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
            to={`/billing?patientId=${patient._id}`}
          >
            Billing
          </Link>
          <Link
            className="rounded-2xl border border-cyan-300 px-4 py-3 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50"
            to={`/patients/${patient._id}/labs`}
          >
            Lab history
          </Link>
          <Link
            className="rounded-2xl border border-indigo-300 px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
            to={`/patients/${patient._id}/medicines`}
          >
            Medicine history
          </Link>
          <Link
            className="rounded-2xl border border-violet-300 px-4 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-50"
            to={`/patients/${patient._id}/notifications`}
          >
            Notifications
          </Link>
          <Link
            className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            to={`/patients/${patient._id}/edit`}
          >
            Edit patient
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
          <h3 className="text-xl font-semibold text-stone-900">Profile details</h3>
          <dl className="mt-6 grid gap-4 md:grid-cols-2">
            <DetailItem label="Gender" value={patient.gender} />
            <DetailItem label="Age" value={patient.age ?? 'Not provided'} />
            <DetailItem label="Date of birth" value={patient.dateOfBirth?.slice?.(0, 10) || patient.dateOfBirth} />
            <DetailItem label="Phone" value={patient.phone} />
            <DetailItem label="Email" value={patient.email} />
            <DetailItem label="Blood group" value={patient.bloodGroup} />
            <DetailItem label="Status" value={patient.isActive ? 'Active' : 'Inactive'} />
            <DetailItem
              label="Address"
              value={[patient.address?.line1, patient.address?.city, patient.address?.state].filter(Boolean).join(', ')}
            />
          </dl>
        </article>

        <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
          <h3 className="text-xl font-semibold text-stone-900">Medical profile</h3>
          <div className="mt-6 grid gap-4">
            <DetailItem label="Allergies" value={patient.allergies?.join(', ')} />
            <DetailItem label="Chronic conditions" value={patient.chronicConditions?.join(', ')} />
            <DetailItem label="Current medications" value={patient.currentMedications?.join(', ')} />
            <DetailItem
              label="Emergency contact"
              value={[patient.emergencyContact?.name, patient.emergencyContact?.relation, patient.emergencyContact?.phone]
                .filter(Boolean)
                .join(' - ')}
            />
            <DetailItem
              label="History summary"
              value={
                summary
                  ? `${summary.totalAppointments} appointments, ${summary.totalConsultations} consultations, ${summary.totalPrescriptions} prescriptions, ${summary.totalInvoices} invoices, ${summary.totalLabOrders ?? 0} lab orders, ${summary.totalDispensings ?? 0} dispensings, ${summary.totalNotifications ?? 0} notifications, ${summary.totalFollowUps ?? 0} follow-ups`
                  : 'No records yet'
              }
            />
          </div>
        </article>
      </div>

      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
        <h3 className="text-xl font-semibold text-stone-900">Patient history</h3>
        <p className="mt-2 text-sm text-stone-600">
          Consultations, prescriptions, lab orders, dispensings, notifications, follow-ups, and invoices now appear in patient history while appointments remain a lightweight placeholder view.
        </p>
        <div className="mt-6">
          <PatientHistoryPanel patientId={patient._id} />
        </div>
      </div>

      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
        <h3 className="text-xl font-semibold text-stone-900">Billing history</h3>
        <p className="mt-2 text-sm text-stone-600">Review issued and draft invoices linked to this patient, including current due amounts.</p>
        <div className="mt-6">
          <PatientInvoiceHistory patientId={patient._id} />
        </div>
      </div>
    </section>
  );
};

export default PatientDetailPage;
