import { useParams } from 'react-router-dom';

import PatientHistoryPanel from './PatientHistoryPanel';

const PatientConsultationHistory = () => {
  const { patientId } = useParams();

  return (
    <section className="grid gap-6">
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Patient history</p>
        <h2 className="mt-2 text-3xl font-semibold text-stone-900">Clinical history</h2>
        <p className="mt-2 text-sm text-stone-600">Review consultations, prescriptions, and placeholder downstream records for this patient.</p>
      </div>

      <PatientHistoryPanel patientId={patientId} />
    </section>
  );
};

export default PatientConsultationHistory;
