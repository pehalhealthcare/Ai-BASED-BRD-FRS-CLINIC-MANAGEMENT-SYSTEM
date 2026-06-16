import { Link } from 'react-router-dom';
import AppointmentStatusBadge from './AppointmentStatusBadge';

const CalendarWeekView = ({ groups = [] }) => {
  if (!groups.length) {
    return <p className="text-sm text-stone-600">No appointments scheduled for this range.</p>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => (
        <section key={group.date} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">{group.date}</h3>
          <div className="mt-4 grid gap-3">
            {(group.appointments || []).map((appointment) => (
              <Link key={appointment._id} to={`/appointments/${appointment._id}`} className="block rounded-2xl bg-stone-50 p-3 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{appointment.startTime} - {appointment.endTime}</p>
                    <p className="mt-1 text-xs text-stone-600">{appointment.patientId?.fullName || 'Patient not provided'}</p>
                    <p className="mt-1 text-xs text-stone-500">{appointment.doctorId?.fullName || 'Doctor not provided'}</p>
                  </div>
                  <AppointmentStatusBadge status={appointment.status} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default CalendarWeekView;
