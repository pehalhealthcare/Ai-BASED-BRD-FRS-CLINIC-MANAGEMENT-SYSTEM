import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDrugSafetySections,
  canUserOverrideDrugSafety,
  getDrugSafetySeverity,
  hasVisibleDrugSafetyWarning,
  isOverrideReasonValid,
  requiresDrugSafetyOverride
} from './drugSafetyUi.js';

const sampleHighRisk = {
  output: {
    severity: 'critical',
    interaction_alerts: [],
    allergy_alerts: [
      {
        medicine: 'Amoxicillin',
        allergy: 'penicillin',
        severity: 'critical',
        message: 'Possible allergy cross-reactivity risk.'
      }
    ],
    contraindication_alerts: [],
    duplicate_therapy_alerts: []
  }
};

test('warning helpers expose visible drug safety alerts', () => {
  assert.equal(getDrugSafetySeverity(sampleHighRisk), 'critical');
  assert.equal(hasVisibleDrugSafetyWarning(sampleHighRisk), true);
  assert.equal(requiresDrugSafetyOverride(sampleHighRisk), true);
  assert.equal(buildDrugSafetySections(sampleHighRisk).length, 1);
});

test('override reason is required for high or critical alerts', () => {
  assert.equal(isOverrideReasonValid(''), false);
  assert.equal(isOverrideReasonValid('Proceed with monitoring.'), true);
});

test('doctor can override but non-doctor cannot', () => {
  assert.equal(canUserOverrideDrugSafety('DOCTOR', sampleHighRisk), true);
  assert.equal(canUserOverrideDrugSafety('ADMIN', sampleHighRisk), false);
  assert.equal(canUserOverrideDrugSafety('RECEPTIONIST', sampleHighRisk), false);
});
