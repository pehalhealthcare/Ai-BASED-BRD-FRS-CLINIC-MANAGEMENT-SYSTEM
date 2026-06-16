import { Link, useParams } from 'react-router-dom';

import PageHeader from '../../components/layout/PageHeader';
import LabHistoryPanel from './LabHistoryPanel';

const PatientLabHistoryPage = () => {
  const { patientId } = useParams();

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Phase 11"
        title="Patient lab history"
        description="Review the patient’s newest-first lab orders and linked reports without leaving the clinic workspace."
        actions={
          <>
            <Link className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50" to={`/patients/${patientId}`}>
              Back to patient
            </Link>
          </>
        }
      />

      <LabHistoryPanel patientId={patientId} />
    </section>
  );
};

export default PatientLabHistoryPage;
