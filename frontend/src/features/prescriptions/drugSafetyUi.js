export const getDrugSafetySeverity = (drugSafetyCheck) => drugSafetyCheck?.output?.severity || 'none';

export const hasVisibleDrugSafetyWarning = (drugSafetyCheck) =>
  ['medium', 'high', 'critical'].includes(getDrugSafetySeverity(drugSafetyCheck));

export const requiresDrugSafetyOverride = (drugSafetyCheck) =>
  ['high', 'critical'].includes(getDrugSafetySeverity(drugSafetyCheck));

export const canUserOverrideDrugSafety = (userRole, drugSafetyCheck) =>
  userRole === 'DOCTOR' && requiresDrugSafetyOverride(drugSafetyCheck);

export const buildDrugSafetySections = (drugSafetyCheck) => {
  const output = drugSafetyCheck?.output || {};

  return [
    { key: 'interaction_alerts', title: 'Interaction alerts', items: output.interaction_alerts || [] },
    { key: 'allergy_alerts', title: 'Allergy alerts', items: output.allergy_alerts || [] },
    { key: 'contraindication_alerts', title: 'Contraindication alerts', items: output.contraindication_alerts || [] },
    { key: 'duplicate_therapy_alerts', title: 'Duplicate therapy alerts', items: output.duplicate_therapy_alerts || [] }
  ].filter((section) => section.items.length > 0);
};

export const isOverrideReasonValid = (value) => String(value || '').trim().length > 0;
