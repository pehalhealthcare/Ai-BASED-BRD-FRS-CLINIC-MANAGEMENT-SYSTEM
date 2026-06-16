import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import { ROLES } from '../../constants/roles';
import useAuth from '../../hooks/useAuth';
import { notificationApi } from '../../lib/api';
import DrugSafetyWarningPanel from './DrugSafetyWarningPanel';
import PrescriptionForm from './PrescriptionForm';
import PrescriptionPdfButton from './PrescriptionPdfButton';
import { hasVisibleDrugSafetyWarning, requiresDrugSafetyOverride } from './drugSafetyUi';
import {
  cancelPrescription,
  finalizePrescription,
  formatPrescriptionAdvice,
  getPrescription,
  updatePrescription
} from './prescriptionApi';
import usePrescriptionDrugSafety from './usePrescriptionDrugSafety';

const createEmptyMedicine = () => ({
  medicineName: '',
  genericName: '',
  dosage: '',
  frequency: '',
  duration: '',
  route: 'oral',
  timing: '',
  instructions: '',
  quantity: '',
  isSubstituteAllowed: false
});

const buildFormFromPrescription = (prescription) => ({
  diagnosisSnapshot: prescription?.diagnosisSnapshot || '',
  symptomsSnapshot: prescription?.symptomsSnapshot || '',
  notes: prescription?.notes || '',
  medicines:
    prescription?.medicines?.length
      ? prescription.medicines.map((medicine) => ({
          ...medicine,
          quantity: medicine.quantity ?? ''
        }))
      : [createEmptyMedicine()],
  advice: prescription?.advice || '',
  followUpDate: prescription?.followUpDate?.slice?.(0, 10) || prescription?.followUpDate || '',
  aiAssist: {
    used: Boolean(prescription?.aiAssist?.used),
    suggestionId: prescription?.aiAssist?.suggestionId || '',
    disclaimer: prescription?.aiAssist?.disclaimer || '',
    doctorReviewed: Boolean(prescription?.aiAssist?.doctorReviewed)
  }
});

const DetailItem = ({ label, value }) => (
  <div className="rounded-2xl bg-stone-50 p-4">
    <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">{label}</dt>
    <dd className="mt-2 text-sm font-medium text-stone-900">{value || 'Not provided'}</dd>
  </div>
);

const PrescriptionDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prescription, setPrescription] = useState(null);
  const [form, setForm] = useState(buildFormFromPrescription(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [formattingAdvice, setFormattingAdvice] = useState(false);
  const [error, setError] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [sharing, setSharing] = useState(false);

  const patientContext = useMemo(() => {
    const patient = prescription?.patientId;

    return {
      id: patient?._id || prescription?.patientId,
      age: patient?.age,
      gender: patient?.gender,
      allergies: patient?.allergies || [],
      conditions: patient?.chronicConditions || [],
      existingMedications: patient?.currentMedications || []
    };
  }, [prescription]);

  const {
    drugSafetyCheckResult,
    overrideReason,
    setOverrideReason,
    checkingSafety,
    safetyError,
    runSafetyCheck,
    buildFinalizePayload,
    extractDrugSafetyFromError
  } = usePrescriptionDrugSafety({
    patientContext,
    medicines: form.medicines,
    userRole: user?.role
  });

  const loadPrescription = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await getPrescription(id);
      setPrescription(response.data.prescription);
      setForm(buildFormFromPrescription(response.data.prescription));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load prescription.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrescription();
  }, [id]);

  const setFieldValue = (path, value) => {
    setForm((current) => {
      const next = typeof structuredClone === 'function' ? structuredClone(current) : JSON.parse(JSON.stringify(current));
      const segments = path.split('.');
      let target = next;

      for (let index = 0; index < segments.length - 1; index += 1) {
        target = target[segments[index]];
      }

      target[segments[segments.length - 1]] = value;
      return next;
    });
  };

  const handleMedicineChange = (index, field, value) => {
    setForm((current) => ({
      ...current,
      medicines: current.medicines.map((medicine, medicineIndex) =>
        medicineIndex === index
          ? {
              ...medicine,
              [field]: value
            }
          : medicine
      )
    }));
  };

  const handleAddMedicine = () => {
    setForm((current) => ({
      ...current,
      medicines: [...current.medicines, createEmptyMedicine()]
    }));
  };

  const handleRemoveMedicine = (index) => {
    setForm((current) => {
      const medicines = current.medicines.filter((_, medicineIndex) => medicineIndex !== index);
      return {
        ...current,
        medicines: medicines.length ? medicines : [createEmptyMedicine()]
      };
    });
  };

  const buildUpdatePayload = () => ({
    notes: form.notes.trim(),
    medicines: form.medicines.map((medicine) => ({
      ...medicine,
      quantity: medicine.quantity ? Number(medicine.quantity) : undefined
    })),
    advice: form.advice.trim(),
    followUpDate: form.followUpDate || null,
    aiAssist: form.aiAssist
  });

  const handleSaveDraft = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await updatePrescription(id, buildUpdatePayload());
      setPrescription(response.data.prescription);
      setForm(buildFormFromPrescription(response.data.prescription));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update prescription draft.');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    setFinalizing(true);
    setError('');

    try {
      const safetyResult = await runSafetyCheck();

      if (
        safetyResult &&
        hasVisibleDrugSafetyWarning(safetyResult) &&
        requiresDrugSafetyOverride(safetyResult) &&
        !overrideReason.trim()
      ) {
        return;
      }

      const response = await finalizePrescription(
        id,
        buildFinalizePayload({
          doctorConfirmation: true,
          ...(form.followUpDate ? { followUpDate: form.followUpDate } : {}),
          finalAdvice: form.advice.trim()
        })
      );
      setPrescription(response.data.prescription);
      setForm(buildFormFromPrescription(response.data.prescription));
    } catch (requestError) {
      extractDrugSafetyFromError(requestError);
      setError(requestError.response?.data?.message || 'Unable to finalize prescription.');
    } finally {
      setFinalizing(false);
    }
  };

  const handleOverrideAndFinalize = async () => {
    setFinalizing(true);
    setError('');

    try {
      const response = await finalizePrescription(
        id,
        buildFinalizePayload({
          doctorConfirmation: true,
          ...(form.followUpDate ? { followUpDate: form.followUpDate } : {}),
          finalAdvice: form.advice.trim(),
          overrideReason: overrideReason.trim()
        })
      );
      setPrescription(response.data.prescription);
      setForm(buildFormFromPrescription(response.data.prescription));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to finalize prescription with override.');
    } finally {
      setFinalizing(false);
    }
  };

  const handleSharePrescription = async () => {
    if (!prescription?.patientId?._id) {
      return;
    }

    setSharing(true);
    setShareMessage('');

    try {
      await notificationApi.send({
        patientId: prescription.patientId._id,
        prescriptionId: prescription._id,
        type: 'prescription_ready',
        channel: 'sms',
        subject: 'Prescription ready',
        body: `Your prescription ${prescription.prescriptionNumber || ''} is ready. Please collect or review it in the patient portal.`
      });
      setShareMessage('Prescription share notification queued.');
    } catch (requestError) {
      setShareMessage(requestError.response?.data?.message || 'Unable to send prescription notification.');
    } finally {
      setSharing(false);
    }
  };

  const handleCancel = async () => {
    const reason = window.prompt('Enter cancellation reason');

    if (!reason?.trim()) {
      return;
    }

    try {
      const response = await cancelPrescription(id, { reason: reason.trim() });
      setPrescription(response.data.prescription);
      setForm(buildFormFromPrescription(response.data.prescription));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to cancel prescription.');
    }
  };

  const handleFormatAdvice = async () => {
    setFormattingAdvice(true);
    setError('');

    try {
      const response = await formatPrescriptionAdvice({
        diagnosis: form.diagnosisSnapshot,
        doctorNotes: form.notes,
        rawAdvice: form.advice || 'Follow doctor advice.'
      });

      setForm((current) => ({
        ...current,
        advice: response.data.formattedAdvice || current.advice,
        aiAssist: {
          ...current.aiAssist,
          used: true,
          disclaimer: response.data.disclaimer || '',
          doctorReviewed: false
        }
      }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to format advice.');
    } finally {
      setFormattingAdvice(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading prescription..." />;
  }

  if (error && !prescription) {
    return <ErrorState title="Prescription unavailable" description={error} />;
  }

  if (!prescription) {
    return <ErrorState title="Prescription unavailable" description="No prescription was returned." />;
  }

  const isDraft = prescription.status === 'draft';
  const canDispense = [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.PHARMACIST].includes(user?.role);

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Prescription detail</p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-900">{prescription.prescriptionNumber || 'Prescription'}</h1>
          <p className="mt-2 text-sm text-stone-600">Finalized prescriptions are locked for normal edits and remain downloadable as PDF.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50" to={`/patients/${prescription.patientId?._id || ''}/history`}>
            Patient history
          </Link>
          {canDispense && prescription.status === 'finalized' ? (
            <Link
              className="rounded-2xl border border-indigo-300 px-4 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
              to={`/prescriptions/${prescription._id}/dispense`}
            >
              {prescription.dispensingStatus === 'dispensed' ? 'View dispensing' : 'Dispense medicines'}
            </Link>
          ) : null}
          <PrescriptionPdfButton prescriptionId={prescription._id} disabled={prescription.status !== 'finalized'} />
          {prescription.status === 'finalized' && [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST].includes(user?.role) ? (
            <button
              type="button"
              onClick={handleSharePrescription}
              disabled={sharing}
              className="rounded-2xl border border-sky-300 px-4 py-3 text-sm font-semibold text-sky-700 hover:bg-sky-50 disabled:opacity-60"
            >
              {sharing ? 'Sending...' : 'Share with patient'}
            </button>
          ) : null}
          {isDraft ? (
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-2xl border border-rose-300 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"
            >
              Cancel draft
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
      {shareMessage ? <p className="rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-700">{shareMessage}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <PrescriptionForm
          form={form}
          error={safetyError}
          saving={saving}
          finalizing={finalizing || checkingSafety}
          formattingAdvice={formattingAdvice}
          isDraft={isDraft}
          onFieldChange={setFieldValue}
          onMedicineChange={handleMedicineChange}
          onAddMedicine={handleAddMedicine}
          onRemoveMedicine={handleRemoveMedicine}
          onSubmitDraft={handleSaveDraft}
          onFinalize={handleFinalize}
          onFormatAdvice={handleFormatAdvice}
        />

        <article className="rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40">
          <h2 className="text-xl font-semibold text-stone-900">Snapshot</h2>
          <dl className="mt-6 grid gap-4">
            <DetailItem label="Patient" value={prescription.patientId?.fullName} />
            <DetailItem label="Doctor" value={prescription.doctorId?.fullName} />
            <DetailItem label="Consultation" value={prescription.consultationId?.chiefComplaint} />
            <DetailItem label="Status" value={prescription.status} />
            <DetailItem label="Dispensing status" value={prescription.dispensingStatus || 'not_dispensed'} />
            <DetailItem label="Advice" value={prescription.advice} />
            <DetailItem label="Follow-up date" value={prescription.followUpDate?.slice?.(0, 10) || prescription.followUpDate} />
            <DetailItem label="AI assist" value={prescription.aiAssist?.used ? 'Used - doctor review required' : 'Not used'} />
          </dl>

          {prescription.consultationId?._id ? (
            <div className="mt-6">
              <Link className="rounded-2xl border border-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50" to={`/consultations/${prescription.consultationId._id}`}>
                Open consultation
              </Link>
            </div>
          ) : null}
        </article>
      </div>

      {isDraft && drugSafetyCheckResult && hasVisibleDrugSafetyWarning(drugSafetyCheckResult) ? (
        <DrugSafetyWarningPanel
          drugSafetyCheck={drugSafetyCheckResult}
          userRole={user?.role}
          overrideReason={overrideReason}
          onOverrideReasonChange={setOverrideReason}
          onOverrideAndSave={handleOverrideAndFinalize}
          onEditPrescription={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          finalizing={finalizing}
        />
      ) : null}
    </section>
  );
};

export default PrescriptionDetailPage;
