import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import DataTable from '../../components/common/DataTable';
import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import Pagination from '../../components/common/Pagination';
import { doctorApi } from '../../lib/api';
import { getAppointments } from './appointmentApi';
import AppointmentStatusBadge from './components/AppointmentStatusBadge';
import NoShowRiskBadge from './components/NoShowRiskBadge';

const AppointmentListPage = () => {
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [filters, setFilters] = useState({ date: '', doctorId: '', status: '' });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAppointments = async (page = pagination.page) => {
    setLoading(true);
    setError('');

    try {
      const [appointmentResponse, doctorResponse] = await Promise.all([
        getAppointments({
          page,
          limit: pagination.limit,
          date: filters.date || undefined,
          doctorId: filters.doctorId || undefined,
          status: filters.status || undefined
        }),
        doctorApi.list({ limit: 100 })
      ]);

      setAppointments(appointmentResponse.data.appointments || []);
      setPagination(appointmentResponse.data.pagination || pagination);
      setDoctors(doctorResponse.data.doctors || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load appointments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments(1);
  }, [filters.date, filters.doctorId, filters.status]);

  if (loading) {
    return <LoadingState label="Loading appointments..." />;
  }

  if (error) {
    return <ErrorState title="Appointments unavailable" description={error} action={<button className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => loadAppointments(pagination.page)}>Retry</button>} />;
  }

  const columns = [
    {
      key: 'appointmentDate',
      label: 'Date & time',
      render: (appointment) => (
        <div>
          <p className="font-medium text-stone-900">{appointment.appointmentDate?.slice?.(0, 10) || 'Not provided'}</p>
          <p className="text-xs text-stone-500">{appointment.startTime || '--'} - {appointment.endTime || '--'}</p>
        </div>
      )
    },
    {
      key: 'patient',
      label: 'Patient',
      render: (appointment) => (
        <div>
          <p className="font-medium text-stone-900">{appointment.patientId?.fullName || 'Not provided'}</p>
          <p className="text-xs text-stone-500">{appointment.patientId?.patientId || appointment.patientId?.phone || 'No identifier'}</p>
        </div>
      )
    },
    {
      key: 'doctor',
      label: 'Doctor',
      render: (appointment) => (
        <div>
          <p className="font-medium text-stone-900">{appointment.doctorId?.fullName || 'Not provided'}</p>
          <p className="text-xs text-stone-500">{appointment.doctorId?.specialization || appointment.doctorId?.doctorCode || 'No specialty'}</p>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (appointment) => <AppointmentStatusBadge status={appointment.status} />
    },
    {
      key: 'risk',
      label: 'No-show risk',
      render: (appointment) => <NoShowRiskBadge risk={appointment.noShowRisk} />
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (appointment) => (
        <Link className="rounded-full border border-stone-300 px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50" to={`/appointments/${appointment._id}`}>
          View details
        </Link>
      )
    }
  ];

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Appointments</p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-900">Appointment queue</h2>
          <p className="mt-2 text-sm text-stone-600">Track booked, confirmed, and completed appointments across the clinic.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50" to="/appointments/calendar">
            Calendar view
          </Link>
          <Link className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700" to="/appointments/new">
            Create appointment
          </Link>
        </div>
      </div>
      <div className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-5 shadow-lg shadow-stone-200/40 md:grid-cols-3">
        <input type="date" value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))} className="rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
        <select value={filters.doctorId} onChange={(event) => setFilters((current) => ({ ...current, doctorId: event.target.value }))} className="rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
          <option value="">All doctors</option>
          {doctors.map((doctor) => (
            <option key={doctor._id} value={doctor._id}>
              {doctor.fullName || doctor.firstName}
            </option>
          ))}
        </select>
        <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100">
          <option value="">All statuses</option>
          {['booked', 'confirmed', 'checked_in', 'in_consultation', 'completed', 'cancelled', 'no_show', 'rescheduled'].map((status) => (
            <option key={status} value={status}>
              {status.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
      </div>
      <DataTable columns={columns} rows={appointments} emptyTitle="No appointments found" emptyDescription="Create an appointment or change the current filters." />
      <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={loadAppointments} />
    </section>
  );
};

export default AppointmentListPage;
