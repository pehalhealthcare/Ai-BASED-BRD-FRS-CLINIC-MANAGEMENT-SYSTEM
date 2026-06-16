import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import { doctorApi } from '../../lib/api';

const DetailItem = ({ label, value }) => (
  <div className="rounded-2xl bg-stone-50 p-4">
    <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">{label}</dt>
    <dd className="mt-2 text-sm font-medium text-stone-900">{value || 'Not provided'}</dd>
  </div>
);

const DoctorDetailPage = () => {
  const { id } = useParams();
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadDoctor = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await doctorApi.get(id);

        if (isMounted) {
          setDoctor(response.data.doctor);
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load doctor.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDoctor();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return <LoadingState label="Loading doctor profile..." />;
  }

  if (error || !doctor) {
    return <ErrorState title="Doctor unavailable" description={error || 'No doctor found.'} />;
  }

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Doctor profile</p>
          <h2 className="mt-2 text-3xl font-semibold text-stone-900">{doctor.fullName || 'Not provided'}</h2>
          <p className="mt-2 text-sm text-stone-600">Doctor code: {doctor.doctorCode || 'Not provided'}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50" to="/doctors">
            Back to list
          </Link>
          <Link className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50" to={`/doctors/${doctor._id}/availability`}>
            Edit availability
          </Link>
          <Link className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700" to={`/doctors/${doctor._id}/edit`}>
            Edit doctor
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
          <h3 className="text-xl font-semibold text-stone-900">Profile details</h3>
          <dl className="mt-6 grid gap-4 md:grid-cols-2">
            <DetailItem label="Specialization" value={doctor.specialization} />
            <DetailItem label="Qualification" value={doctor.qualification} />
            <DetailItem label="Phone" value={doctor.phone} />
            <DetailItem label="Email" value={doctor.email} />
            <DetailItem label="Experience" value={doctor.experienceYears !== undefined ? `${doctor.experienceYears} years` : 'Not provided'} />
            <DetailItem label="Consultation fee" value={doctor.consultationFee ? `Rs. ${doctor.consultationFee}` : 'Not provided'} />
            <DetailItem label="Status" value={doctor.isActive ? 'Active' : 'Inactive'} />
            <DetailItem label="Gender" value={doctor.gender} />
          </dl>
        </article>

        <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
          <h3 className="text-xl font-semibold text-stone-900">Availability</h3>
          <div className="mt-6 grid gap-3">
            {doctor.availability?.length ? (
              doctor.availability.map((item) => (
                <div key={item.dayOfWeek} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                  <p className="text-sm font-semibold capitalize text-stone-900">{item.dayOfWeek}</p>
                  <p className="mt-1 text-sm text-stone-600">
                    {item.isAvailable
                      ? `${item.startTime || 'Not provided'} - ${item.endTime || 'Not provided'} · ${item.slotDurationMinutes || 30} minutes`
                      : 'Unavailable'}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-stone-600">No availability configured yet.</p>
            )}
          </div>
        </article>
      </div>
    </section>
  );
};

export default DoctorDetailPage;
