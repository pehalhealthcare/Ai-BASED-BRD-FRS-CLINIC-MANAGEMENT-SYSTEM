import { Link } from 'react-router-dom';
import AppointmentStatusBadge from './AppointmentStatusBadge';

const CalendarDayView = ({ groups = [] }) => {
  if (!groups.length) {
    return <p className="text-sm text-stone-600">No appointments scheduled for this day.</p>;
  }

  return (
    <div className="grid gap-4">
      {groups.map((group) => (
        <div key={group.date} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">{group.date}</h3>
          <div className="mt-4 grid gap-3">
            {group.appointments?.map((appointment) => (
              <Link key={appointment._id} to={`/appointments/${appointment._id}`} className="block rounded-2xl bg-white p-4 shadow-sm hover:shadow-md transition">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">{appointment.startTime} - {appointment.endTime}</p>
                    <p className="mt-1 text-sm text-stone-600">
                      {appointment.patientId?.fullName || 'Patient not provided'} with {appointment.doctorId?.fullName || 'Doctor not provided'}
                    </p>
                  </div>
                  <AppointmentStatusBadge status={appointment.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CalendarDayView;
