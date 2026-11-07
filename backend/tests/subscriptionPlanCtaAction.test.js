const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const SubscriptionPlan = require('../src/modules/subscriptions/subscriptionPlan.model');

describe('Subscription Plan CTA Action Specifications', () => {
  it('should define ctaAction field with valid enum [setup_clinic, contact_sales] and default to setup_clinic', () => {
    const schemaType = SubscriptionPlan.schema.path('ctaAction');
    assert.ok(schemaType, 'ctaAction path should exist on schema');
    assert.equal(schemaType.defaultValue, 'setup_clinic');
    assert.deepEqual(schemaType.enumValues, ['setup_clinic', 'contact_sales']);
  });

  it('should accept contact_sales as a valid ctaAction', () => {
    const plan = new SubscriptionPlan({
      name: 'Custom Enterprise Test',
      code: 'TEST_ENTERPRISE',
      priceMonthly: 0,
      priceYearly: 0,
      ctaAction: 'contact_sales',
      ctaText: 'Talk to Sales'
    });

    const error = plan.validateSync();
    assert.equal(error, undefined, 'Plan with contact_sales should validate cleanly');
    assert.equal(plan.ctaAction, 'contact_sales');
    assert.equal(plan.ctaText, 'Talk to Sales');
  });

  it('should reject invalid ctaAction values', () => {
    const plan = new SubscriptionPlan({
      name: 'Invalid CTA Test',
      code: 'INVALID_CTA',
      priceMonthly: 0,
      priceYearly: 0,
      ctaAction: 'invalid_action'
    });

    const error = plan.validateSync();
    assert.ok(error, 'Plan with invalid ctaAction should fail validation');
    assert.ok(error.errors.ctaAction, 'Validation error should be on ctaAction field');
  });

  it('should preserve and clone ctaAction during duplicate operation', () => {
    const originalPlan = {
      name: 'AI Enterprise ClinicOS',
      code: 'ENTERPRISE',
      priceMonthly: 24999,
      priceYearly: 249999,
      isEnterprise: true,
      ctaAction: 'contact_sales',
      ctaText: 'Contact Enterprise'
    };

    const duplicatedPlan = {
      name: `${originalPlan.name} (Copy)`,
      code: `${originalPlan.code}_COPY`,
      priceMonthly: originalPlan.priceMonthly,
      priceYearly: originalPlan.priceYearly,
      isEnterprise: originalPlan.isEnterprise,
      ctaAction: originalPlan.ctaAction || (originalPlan.isEnterprise ? 'contact_sales' : 'setup_clinic'),
      ctaText: originalPlan.ctaText
    };

    assert.equal(duplicatedPlan.ctaAction, 'contact_sales');
    assert.equal(duplicatedPlan.ctaText, 'Contact Enterprise');
  });
});

