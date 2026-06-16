import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import DataTable from '../../components/common/DataTable';
import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import Pagination from '../../components/common/Pagination';
import SearchInput from '../../components/common/SearchInput';
import { patientApi } from '../../lib/api';

const PatientListPage = () => {
  const [patients, setPatients] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [gender, setGender] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPatients = async (page = pagination.page) => {
    setLoading(true);
    setError('');

    try {
      const response = await patientApi.list({
        page,
        limit: pagination.limit,
        search: search || undefined,
        gender: gender || undefined,
        isActive: status ? status === 'active' : undefined
      });

      setPatients(response.data.patients || []);
      setPagination(response.data.pagination || pagination);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load patients.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients(1);
  }, [search, gender, status]);

  if (loading) {
    return <LoadingState label="Loading patients..." />;
  }

  if (error) {
    return <ErrorState title="Patients unavailable" description={error} action={<button className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => loadPatients(pagination.page)}>Retry</button>} />;
  }

  const columns = [
    { key: 'patientId', label: 'Patient ID' },
    {
      key: 'fullName',
      label: 'Name',
      render: (patient) => patient.fullName || 'Not provided'
    },
    { key: 'gender', label: 'Gender', render: (patient) => patient.gender || 'Not provided' },
    { key: 'phone', label: 'Phone', render: (patient) => patient.phone || 'Not provided' },
    { key: 'age', label: 'Age', render: (patient) => patient.age ?? 'Not provided' },
    {
      key: 'isActive',
      label: 'Status',
      render: (patient) => (
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${patient.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-700'}`}>
          {patient.isActive ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (patient) => (
        <div className="flex flex-wrap gap-2">
          <Link className="rounded-full border border-stone-300 px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50" to={`/patients/${patient._id}`}>
            View
          </Link>
          <Link className="rounded-full border border-stone-300 px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50" to={`/patients/${patient._id}/edit`}>
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
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Patients</p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-900">Patient registry</h2>
          <p className="mt-2 text-sm text-stone-600">Search and manage clinic-scoped patient profiles.</p>
        </div>
        <Link className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700" to="/patients/new">
          Create patient
        </Link>
      </div>

      <div className="grid gap-3 rounded-3xl border border-stone-200 bg-white p-5 shadow-lg shadow-stone-200/40 md:grid-cols-[2fr_1fr_1fr]">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by patient ID, name, phone, or email" />
        <select
          value={gender}
          onChange={(event) => setGender(event.target.value)}
          className="rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        >
          <option value="">All genders</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
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
        rows={patients}
        emptyTitle="No patients found"
        emptyDescription="Create a patient or change the current search filters."
      />

      <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={loadPatients} />
    </section>
  );
};

export default PatientListPage;
