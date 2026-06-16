import { Link, useSearchParams } from 'react-router-dom';

import Card from '../../components/common/Card';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/layout/PageHeader';
import PrescriptionCreatePage from '../../features/prescriptions/PrescriptionCreatePage';
import PrescriptionListPage from '../../features/prescriptions/PrescriptionListPage';

const PrescriptionBuilderPage = () => {
  const [searchParams] = useSearchParams();
  const consultationId = searchParams.get('consultationId');
  const patientId = searchParams.get('patientId');

  if (consultationId) {
    return <PrescriptionCreatePage />;
  }

  if (patientId) {
    return <PrescriptionListPage />;
  }

  return (
    <section className="grid gap-6">
      <PageHeader
        eyebrow="Prescriptions"
        title="Prescription builder"
        description="Start a prescription from a consultation context so medicines stay linked to the doctor-reviewed EMR workflow."
      />
      <Card>
        <EmptyState
          title="Prescription context required"
          description="Open this page from a consultation or a patient record. The current MVP keeps prescription creation linked to the live consultation workflow instead of using isolated demo data."
          action={
            <div className="flex flex-wrap gap-3">
              <Link className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50" to="/consultations">
                Open consultations
              </Link>
              <Link className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700" to="/patients">
                Open patients
              </Link>
            </div>
          }
        />
      </Card>
    </section>
  );
};

export default PrescriptionBuilderPage;
