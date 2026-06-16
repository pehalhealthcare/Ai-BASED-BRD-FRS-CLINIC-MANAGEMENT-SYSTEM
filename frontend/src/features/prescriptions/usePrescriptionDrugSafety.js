import { useCallback, useState } from 'react';

import { drugSafetyCheck } from './prescriptionApi';
import {
  hasVisibleDrugSafetyWarning,
  isOverrideReasonValid,
  requiresDrugSafetyOverride
} from './drugSafetyUi';

const buildMedicationPayload = (medicines = []) =>
  medicines
    .filter((medicine) => medicine?.medicineName?.trim())
    .map((medicine) => ({
      name: medicine.medicineName.trim(),
      generic_name: medicine.genericName?.trim() || undefined,
      dosage: medicine.dosage?.trim() || undefined,
      frequency: medicine.frequency?.trim() || undefined,
      duration: medicine.duration?.trim() || undefined
    }));

export const usePrescriptionDrugSafety = ({ patientContext, medicines, userRole }) => {
  const [drugSafetyCheckResult, setDrugSafetyCheckResult] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [checkingSafety, setCheckingSafety] = useState(false);
  const [safetyError, setSafetyError] = useState('');

  const clearSafetyState = useCallback(() => {
    setDrugSafetyCheckResult(null);
    setOverrideReason('');
    setSafetyError('');
  }, []);

  const runSafetyCheck = useCallback(async () => {
    const medications = buildMedicationPayload(medicines);

    if (!medications.length) {
      setSafetyError('Add at least one medicine before running drug safety screening.');
      return null;
    }

    setCheckingSafety(true);
    setSafetyError('');

    try {
      const response = await drugSafetyCheck({
        patient: {
          id: patientContext?.id,
          age: patientContext?.age,
          gender: patientContext?.gender,
          allergies: patientContext?.allergies || [],
          conditions: patientContext?.conditions || []
        },
        medications,
        existing_medications: patientContext?.existingMedications || []
      });

      const result = response?.data || response;
      setDrugSafetyCheckResult(result);
      return result;
    } catch (requestError) {
      setSafetyError(requestError.response?.data?.message || 'Unable to run drug safety screening.');
      return null;
    } finally {
      setCheckingSafety(false);
    }
  }, [medicines, patientContext]);

  const canProceedWithFinalize = useCallback(() => {
    if (!drugSafetyCheckResult || !hasVisibleDrugSafetyWarning(drugSafetyCheckResult)) {
      return true;
    }

    if (!requiresDrugSafetyOverride(drugSafetyCheckResult)) {
      return true;
    }

    if (userRole !== 'DOCTOR') {
      return false;
    }

    return isOverrideReasonValid(overrideReason);
  }, [drugSafetyCheckResult, overrideReason, userRole]);

  const buildFinalizePayload = useCallback(
    (basePayload = {}) => ({
      ...basePayload,
      ...(isOverrideReasonValid(overrideReason) ? { overrideReason: overrideReason.trim() } : {})
    }),
    [overrideReason]
  );

  const extractDrugSafetyFromError = useCallback((requestError) => {
    const nested = requestError?.response?.data?.errors?.[0]?.drugSafetyCheck;

    if (nested) {
      setDrugSafetyCheckResult(nested);
    }

    return nested;
  }, []);

  return {
    drugSafetyCheckResult,
    overrideReason,
    setOverrideReason,
    checkingSafety,
    safetyError,
    runSafetyCheck,
    clearSafetyState,
    canProceedWithFinalize,
    buildFinalizePayload,
    extractDrugSafetyFromError
  };
};

export default usePrescriptionDrugSafety;
