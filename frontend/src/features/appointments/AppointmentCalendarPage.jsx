import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import { doctorApi } from '../../lib/api';
import { getCalendarAppointments } from './appointmentApi';
import CalendarDayView from './components/CalendarDayView';
import CalendarWeekView from './components/CalendarWeekView';
import useAuth from '../../hooks/useAuth';
import { ROLES } from '../../constants/roles';

const getToday = () => new Date().toISOString().slice(0, 10);

const AppointmentCalendarPage = () => {
  const { user } = useAuth();
  const isDoctor = user?.role === ROLES.DOCTOR;
  const [filters, setFilters] = useState({ view: 'day', date: getToday(), doctorId: '' });
  const [doctors, setDoctors] = useState([]);
  const [calendarData, setCalendarData] = useState({ groupedAppointments: [], range: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCalendar = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError('');

    try {
      const fetchList = isDoctor
        ? getCalendarAppointments({
            view: filters.view,
            date: filters.date,
            doctorId: filters.doctorId || undefined
          })
        : Promise.all([
            getCalendarAppointments({
              view: filters.view,
              date: filters.date,
              doctorId: filters.doctorId || undefined
            }),
            doctorApi.list({ limit: 100 })
          ]);

      const result = await fetchList;
      if (isDoctor) {
        setCalendarData(result.data);
      } else {
        setCalendarData(result[0].data);
        setDoctors(result[1].data.doctors || []);
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load appointment calendar.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (isDoctor) {
      const fetchDoctorProfile = async () => {
        try {
          const res = await doctorApi.getMyProfile();
          const docId = res.data?.doctor?._id || res.data?._id;
          if (docId) {
            setFilters((current) => ({ ...current, doctorId: docId }));
          }
        } catch (err) {
          console.error("Failed to load doctor profile:", err);
        }
      };
      fetchDoctorProfile();
    }
  }, [isDoctor]);

  useEffect(() => {
    if (isDoctor && !filters.doctorId) {
      return;
    }

    loadCalendar(true);
    const interval = setInterval(() => {
      loadCalendar(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [filters.view, filters.date, filters.doctorId, isDoctor]);

  if (loading) {
    return <LoadingState label="Loading appointment calendar..." />;
  }

  if (error) {
    return <ErrorState title="Calendar unavailable" description={error} action={<button className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" onClick={loadCalendar}>Retry</button>} />;
  }

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Appointments</p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-900">Calendar view</h2>
          <p className="mt-2 text-sm text-stone-600">Review appointment flow across day and week views.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => loadCalendar(true)}
            className="rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 transition"
          >
            Refresh Calendar
          </button>
          <Link className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700" to="/appointments/new">
            Create appointment
          </Link>
        </div>
      </div>
      <div className={`grid gap-3 rounded-3xl border border-stone-200 bg-white p-5 shadow-lg shadow-stone-200/40 md:grid-cols-${isDoctor ? '2' : '3'} text-black`}>
        <select value={filters.view} onChange={(event) => setFilters((current) => ({ ...current, view: event.target.value }))} className="rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
          <option value="day">Day view</option>
          <option value="week">Week view</option>
          <option value="month">Month view</option>
        </select>
        <input type="date" value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))} className="rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
        {!isDoctor && (
          <select value={filters.doctorId} onChange={(event) => setFilters((current) => ({ ...current, doctorId: event.target.value }))} className="rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
            <option value="">All doctors</option>
            {doctors.map((doctor) => (
              <option key={doctor._id} value={doctor._id}>
                {doctor.fullName || doctor.firstName}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-stone-900">Calendar results</h3>
          <p className="mt-1 text-sm text-stone-600">Range: {calendarData.range?.from || filters.date} to {calendarData.range?.to || filters.date}</p>
        </div>
        {filters.view === 'week' || filters.view === 'month' ? <CalendarWeekView groups={calendarData.groupedAppointments || []} /> : <CalendarDayView groups={calendarData.groupedAppointments || []} />}
      </div>
    </section>
  );
};

export default AppointmentCalendarPage;
