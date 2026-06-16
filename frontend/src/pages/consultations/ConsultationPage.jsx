import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';

import appointmentApi from '../../api/appointmentApi';
import consultationApi from '../../api/consultationApi';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import PageHeader from '../../components/layout/PageHeader';
import LegacyConsultationPage from '../../features/consultations/ConsultationPage';

const getToday = () => new Date().toISOString().slice(0, 10);

const ConsultationPage = () => {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const consultationId = params.consultationId || searchParams.get('consultationId');
  const appointmentId = params.appointmentId || searchParams.get('appointmentId');
  const [appointments, setAppointments] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (consultationId || appointmentId) {
      return;
    }

    let isMounted = true;

    const loadLaunchpad = async () => {
      setLoading(true);
      setError('');

      try {
        const [appointmentData, consultationData] = await Promise.all([
          appointmentApi.list({ date: getToday(), limit: 10 }),
          consultationApi.list({ page: 1, limit: 5 })
        ]);

        if (!isMounted) {
          return;
        }

        setAppointments(appointmentData.appointments || []);
        setConsultations(consultationData.consultations || []);
      } catch (requestError) {
        if (isMounted) {
          setError(requestError?.response?.data?.message || 'Unable to load consultation workspace.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadLaunchpad();

    return () => {
      isMounted = false;
    };
  }, [consultationId, appointmentId]);

  if (consultationId || appointmentId) {
    return <LegacyConsultationPage />;
  }

  if (loading) {
    return <LoadingState label="Loading consultation launchpad..." />;
  }

  if (error) {
    return <ErrorState title="Consultation workspace unavailable" description={error} />;
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Consultations"
        title="Consultation workspace"
        description="Select an appointment to start or continue a doctor consultation. AI suggestions remain assistive only and must be reviewed by a doctor."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <h2 className="text-xl font-semibold text-stone-900">Today’s appointments</h2>
          <p className="mt-1 text-sm text-stone-600">Pick an appointment to open the EMR consultation screen.</p>

          {!appointments.length ? (
            <div className="mt-5">
              <EmptyState title="No appointments available" description="No appointment records were returned for today." />
            </div>
          ) : (
            <div className="mt-5 grid gap-3">
              {appointments.map((appointment) => (
                <div key={appointment._id} className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-stone-900">{appointment.patientId?.fullName || 'Patient not provided'}</p>
                    <p className="mt-1 text-sm text-stone-600">
                      {appointment.startTime || '--'} • {appointment.doctorId?.fullName || 'Doctor not provided'} • {String(appointment.status || '').replaceAll('_', ' ')}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const next = new URLSearchParams(searchParams);
                      next.set('appointmentId', appointment._id);
                      setSearchParams(next);
                    }}
                  >
                    Open consultation
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-stone-900">Recent consultations</h2>
          <p className="mt-1 text-sm text-stone-600">Resume a saved consultation if you already know its context.</p>

          {!consultations.length ? (
            <div className="mt-5">
              <EmptyState title="No consultations found" description="Saved consultations will appear here once doctors start documenting EMR notes." />
            </div>
          ) : (
            <div className="mt-5 grid gap-3">
              {consultations.map((consultation) => (
                <div key={consultation._id} className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-stone-900">{consultation.patientId?.fullName || 'Patient not provided'}</p>
                    <p className="mt-1 text-sm text-stone-600">
                      {consultation.chiefComplaint || 'Chief complaint not provided'} • {String(consultation.status || '').replaceAll('_', ' ')}
                    </p>
                  </div>
                  <Link className="inline-flex items-center justify-center rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-100" to={`/consultations/${consultation._id}`}>
                    View consultation
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </section>
  );
};

export default ConsultationPage;
