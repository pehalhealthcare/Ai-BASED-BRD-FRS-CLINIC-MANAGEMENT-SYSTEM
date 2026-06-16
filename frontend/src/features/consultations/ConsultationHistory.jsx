import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import DataTable from '../../components/common/DataTable';
import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import Pagination from '../../components/common/Pagination';
import { getPatientConsultationHistory } from './consultationApi';

const ConsultationHistory = ({ patientId, title = 'Clinical history', compact = false }) => {
  const [consultations, setConsultations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(Boolean(patientId));
  const [error, setError] = useState('');

  const loadHistory = async (page = 1) => {
    if (!patientId) {
      setConsultations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await getPatientConsultationHistory(patientId, { page, limit: compact ? 5 : 10 });
      setConsultations(response.data.consultations || []);
      setPagination(response.data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load consultation history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(1);
  }, [patientId, compact]);

  if (loading) {
    return <LoadingState label="Loading consultation history..." />;
  }

  if (error) {
    return <ErrorState title="Consultation history unavailable" description={error} />;
  }

  const columns = [
    {
      key: 'date',
      label: 'Date',
      render: (row) => row.createdAt?.slice?.(0, 10) || row.date?.slice?.(0, 10) || 'Not provided'
    },
    {
      key: 'doctor',
      label: 'Doctor',
      render: (row) => row.doctor?.fullName || 'Not provided'
    },
    {
      key: 'chiefComplaint',
      label: 'Complaint',
      render: (row) => row.chiefComplaint || 'Not provided'
    },
    {
      key: 'diagnosis',
      label: 'Diagnosis',
      render: (row) => row.diagnosis?.primary || row.diagnosis?.secondary?.join(', ') || 'Not provided'
    },
    {
      key: 'followUp',
      label: 'Follow-up',
      render: (row) => row.followUp?.date?.slice?.(0, 10) || row.followUp?.date || 'Not scheduled'
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <Link className="font-semibold text-emerald-700 hover:text-emerald-800" to={`/consultations/${row._id}`}>
          View
        </Link>
      )
    }
  ];

  return (
    <section className="grid gap-4">
      <div>
        <h3 className="text-xl font-semibold text-stone-900">{title}</h3>
        <p className="mt-2 text-sm text-stone-600">Review previous consultations, diagnosis summaries, and follow-up details.</p>
      </div>
      <DataTable
        columns={columns}
        rows={consultations}
        emptyTitle="No consultations yet"
        emptyDescription="Saved consultations will appear here once the doctor starts using the EMR workflow."
      />
      {pagination.totalPages > 1 ? (
        <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={loadHistory} />
      ) : null}
    </section>
  );
};

export default ConsultationHistory;
