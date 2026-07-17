import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import consultationApi from '../../api/consultationApi';

const AppointmentConsultationButton = ({ appointmentId, status }) => {
  const navigate = useNavigate();
  const [consultationId, setConsultationId] = useState(null);
  const [loading, setLoading] = useState(false);

  const isCompleted = status === 'completed';

  // If completed, try to fetch existing consultationId
  useEffect(() => {
    if (!isCompleted || !appointmentId) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await consultationApi.getByAppointment(appointmentId);
        const cId = res?.consultation?._id;
        if (cId) setConsultationId(cId);
      } catch (e) {
        console.warn('No consultation found for this appointment.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [appointmentId, isCompleted]);

  if (isCompleted) {
    return (
      <button
        onClick={() => {
          if (consultationId) {
            navigate(`/consultations/${consultationId}`);
          } else {
            navigate(`/appointments/${appointmentId}/consultation`);
          }
        }}
        disabled={loading}
        className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-60"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <span>📋</span> View Consultation Details
          </>
        )}
      </button>
    );
  }

  return (
    <Link
      className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition"
      to={`/appointments/${appointmentId}/consultation`}
    >
      Open consultation
    </Link>
  );
};

export default AppointmentConsultationButton;
