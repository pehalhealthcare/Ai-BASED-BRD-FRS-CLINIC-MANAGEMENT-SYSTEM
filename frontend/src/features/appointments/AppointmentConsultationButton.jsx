import { Link } from 'react-router-dom';

const AppointmentConsultationButton = ({ appointmentId }) => (
  <Link
    className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
    to={`/appointments/${appointmentId}/consultation`}
  >
    Open consultation
  </Link>
);

export default AppointmentConsultationButton;
