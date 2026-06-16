import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import DataTable from '../../components/common/DataTable';
import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import Pagination from '../../components/common/Pagination';
import SearchInput from '../../components/common/SearchInput';
import { doctorApi } from '../../lib/api';

const DoctorListPage = () => {
  const [doctors, setDoctors] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDoctors = async (page = pagination.page) => {
    setLoading(true);
    setError('');

    try {
      const response = await doctorApi.list({
        page,
        limit: pagination.limit,
        search: search || undefined,
        specialization: specialization || undefined,
        isActive: status ? status === 'active' : undefined
      });

      setDoctors(response.data.doctors || []);
      setPagination(response.data.pagination || pagination);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load doctors.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors(1);
  }, [search, specialization, status]);

  if (loading) {
    return <LoadingState label="Loading doctors..." />;
  }

  if (error) {
    return <ErrorState title="Doctors unavailable" description={error} action={<button className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => loadDoctors(pagination.page)}>Retry</button>} />;
  }

  const columns = [
    { key: 'doctorCode', label: 'Doctor code' },
    { key: 'fullName', label: 'Name', render: (doctor) => doctor.fullName || 'Not provided' },
    { key: 'specialization', label: 'Specialization', render: (doctor) => doctor.specialization || 'Not provided' },
    { key: 'phone', label: 'Phone', render: (doctor) => doctor.phone || 'Not provided' },
    { key: 'consultationFee', label: 'Fee', render: (doctor) => (doctor.consultationFee ? `Rs. ${doctor.consultationFee}` : 'Not provided') },
    {
      key: 'isActive',
      label: 'Status',
      render: (doctor) => (
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${doctor.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-700'}`}>
          {doctor.isActive ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (doctor) => (
        <div className="flex flex-wrap gap-2">
          <Link className="rounded-full border border-stone-300 px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50" to={`/doctors/${doctor._id}`}>
            View
          </Link>
          <Link className="rounded-full border border-stone-300 px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50" to={`/doctors/${doctor._id}/edit`}>
            Edit
          </Link>
        </div>
      )
    }
  ];

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Doctors</p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-900">Doctor directory</h2>
          <p className="mt-2 text-sm text-stone-600">Manage clinic-scoped doctors and baseline availability.</p>
        </div>
        <Link className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700" to="/doctors/new">
          Create doctor
        </Link>
      </div>

      <div className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-5 shadow-lg shadow-stone-200/40 md:grid-cols-[2fr_1fr_1fr]">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by doctor code, name, specialization, phone, or email" />
        <input
          value={specialization}
          onChange={(event) => setSpecialization(event.target.value)}
          placeholder="Filter by specialization"
          className="rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={doctors}
        emptyTitle="No doctors found"
        emptyDescription="Create a doctor or change the current search filters."
      />

      <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={loadDoctors} />
    </section>
  );
};

export default DoctorListPage;
