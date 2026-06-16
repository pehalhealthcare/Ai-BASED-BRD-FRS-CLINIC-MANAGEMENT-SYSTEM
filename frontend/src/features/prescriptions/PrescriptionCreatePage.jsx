import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import ErrorState from '../../components/common/ErrorState';
import LoadingState from '../../components/common/LoadingState';
import useAuth from '../../hooks/useAuth';
import { getConsultation } from '../consultations/consultationApi';
import DrugSafetyWarningPanel from './DrugSafetyWarningPanel';
import PrescriptionForm from './PrescriptionForm';
import { createPrescription, finalizePrescription, formatPrescriptionAdvice } from './prescriptionApi';
import { hasVisibleDrugSafetyWarning, requiresDrugSafetyOverride } from './drugSafetyUi';
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

const createInitialForm = () => ({
  diagnosisSnapshot: '',
  symptomsSnapshot: '',
  notes: '',
  medicines: [createEmptyMedicine()],
  advice: '',
  followUpDate: '',
  aiAssist: {
    used: false,
    suggestionId: '',
    disclaimer: '',
    doctorReviewed: false
  }
});

const PrescriptionCreatePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patientId') || '';
  const consultationId = searchParams.get('consultationId') || '';

  const [consultation, setConsultation] = useState(null);
  const [form, setForm] = useState(createInitialForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [formattingAdvice, setFormattingAdvice] = useState(false);
  const [error, setError] = useState('');

  const patientContext = useMemo(() => {
    const patient = consultation?.patientId;

    return {
      id: patient?._id || patientId || consultation?.patientId,
      age: patient?.age,
      gender: patient?.gender,
      allergies: patient?.allergies || [],
      conditions: patient?.chronicConditions || [],
      existingMedications: patient?.currentMedications || []
    };
  }, [consultation, patientId]);

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

  useEffect(() => {
    let isMounted = true;

    const loadConsultation = async () => {
      if (!consultationId) {
        setError('consultationId is required to create a prescription.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await getConsultation(consultationId);
        const nextConsultation = response.data.consultation;

        if (isMounted) {
          setConsultation(nextConsultation);
          setForm((current) => ({
            ...current,
            diagnosisSnapshot:
              nextConsultation?.diagnosis?.primary ||
              nextConsultation?.diagnosis?.notes ||
              '',
            symptomsSnapshot: (nextConsultation?.symptoms || [])
              .map((item) => item?.name || '')
              .filter(Boolean)
              .join(', '),
            notes: nextConsultation?.clinicalNotes || '',
            advice: nextConsultation?.treatmentPlan || '',
            followUpDate: nextConsultation?.followUp?.date?.slice?.(0, 10) || ''
          }));
        }
      } catch (requestError) {
        if (isMounted) {
          setError(requestError.response?.data?.message || 'Unable to load consultation context.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadConsultation();

    return () => {
      isMounted = false;
    };
  }, [consultationId]);

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

  const buildPayload = () => ({
    patientId: patientId || consultation?.patientId?._id,
    consultationId,
    appointmentId: consultation?.appointmentId?._id,
    notes: form.notes.trim(),
    medicines: form.medicines.map((medicine) => ({
      ...medicine,
      quantity: medicine.quantity ? Number(medicine.quantity) : undefined
    })),
    advice: form.advice.trim(),
    ...(form.followUpDate ? { followUpDate: form.followUpDate } : {}),
    aiAssist: form.aiAssist.used
      ? {
          ...form.aiAssist,
          disclaimer: form.aiAssist.disclaimer || 'AI formatted this text only. Doctor approval is mandatory.'
        }
      : undefined
  });

  const handleSaveDraft = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await createPrescription(buildPayload());
      navigate(`/prescriptions/${response.data.prescription._id}`, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create prescription draft.');
    } finally {
      setSaving(false);
    }
  };

  const finalizeDraft = async (overridePayload = {}) => {
    const createResponse = await createPrescription(buildPayload());
    const prescriptionId = createResponse.data.prescription._id;
    await finalizePrescription(
      prescriptionId,
      buildFinalizePayload({
        doctorConfirmation: true,
        ...(form.followUpDate ? { followUpDate: form.followUpDate } : {}),
        finalAdvice: form.advice.trim(),
        ...overridePayload
      })
    );
    navigate(`/prescriptions/${prescriptionId}`, { replace: true });
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

      await finalizeDraft();
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
      await finalizeDraft({ overrideReason: overrideReason.trim() });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to finalize prescription with override.');
    } finally {
      setFinalizing(false);
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
    return <LoadingState label="Loading prescription context..." />;
  }

  if (error && !consultation) {
    return <ErrorState title="Prescription workspace unavailable" description={error} />;
  }

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg shadow-stone-200/40 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Phase 7</p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-900">Create prescription</h1>
          <p className="mt-2 text-sm text-stone-600">
            Prescription draft is doctor-controlled. AI formatting only helps reword advice and never prescribes medicines automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {consultation?._id ? (
            <Link className="rounded-2xl border border-stone-300 px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50" to={`/consultations/${consultation._id}`}>
              Back to consultation
            </Link>
          ) : null}
        </div>
      </div>

      <PrescriptionForm
        form={form}
        error={error || safetyError}
        saving={saving}
        finalizing={finalizing || checkingSafety}
        formattingAdvice={formattingAdvice}
        isDraft
        onFieldChange={setFieldValue}
        onMedicineChange={handleMedicineChange}
        onAddMedicine={handleAddMedicine}
        onRemoveMedicine={handleRemoveMedicine}
        onSubmitDraft={handleSaveDraft}
        onFinalize={handleFinalize}
        onFormatAdvice={handleFormatAdvice}
      />

      {drugSafetyCheckResult && hasVisibleDrugSafetyWarning(drugSafetyCheckResult) ? (
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

export default PrescriptionCreatePage;
