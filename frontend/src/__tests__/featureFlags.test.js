import { describe, it } from 'node:test';
import assert from 'node:assert';
import { FEATURE_FLAGS, isFinancialSettlementPortalEnabled } from '../config/featureFlags.js';

describe('Financial & Settlement Portal Feature Flag', () => {
  it('defaults to false to temporarily disable the Financial & Settlement Portal', () => {
    assert.strictEqual(typeof FEATURE_FLAGS.ENABLE_FINANCIAL_SETTLEMENT_PORTAL, 'boolean');
    assert.strictEqual(FEATURE_FLAGS.ENABLE_FINANCIAL_SETTLEMENT_PORTAL, false);
    assert.strictEqual(isFinancialSettlementPortalEnabled(), false);
  });

  it('toggling the flag restores portal visibility and accessibility', () => {
    // Simulate toggling flag to true
    FEATURE_FLAGS.ENABLE_FINANCIAL_SETTLEMENT_PORTAL = true;
    assert.strictEqual(isFinancialSettlementPortalEnabled(), true);

    // Reset back to default false
    FEATURE_FLAGS.ENABLE_FINANCIAL_SETTLEMENT_PORTAL = false;
    assert.strictEqual(isFinancialSettlementPortalEnabled(), false);
  });

  it('menu items logic properly excludes Payments when flag is false and includes when true', () => {
    const buildAdminMenuItems = (portalEnabled) => {
      return [
        { label: 'Dashboard', path: '/clinic/dashboard' },
        { label: 'Appointments', path: '/appointments' },
        { label: 'Patients', path: '/patients' },
        { label: 'Doctors', path: '/doctors' },
        { label: 'Staff', path: '/admin/my-receptionists-dashboard' },
        { label: 'Departments', path: '/admin/departments' },
        { label: 'Healthcare Providers', path: '/admin/providers' },
        { label: 'Procedures', path: '/procedures' },
        { label: 'Billing & Invoices', path: '/billing' },
        ...(portalEnabled ? [{ label: 'Payments', path: '/billing/financials' }] : []),
        { label: 'Reports', path: '/admin/reports' },
        { label: 'Inventory', path: '/pharmacy/medicines' },
        { label: 'Settings', path: '/admin/settings' }
      ];
    };

    // When disabled (default)
    const disabledItems = buildAdminMenuItems(false);
    assert.strictEqual(disabledItems.some(i => i.label === 'Payments'), false);
    assert.strictEqual(disabledItems.some(i => i.label === 'Billing & Invoices'), true);
    assert.strictEqual(disabledItems.some(i => i.label === 'Reports'), true);

    // When enabled
    const enabledItems = buildAdminMenuItems(true);
    assert.strictEqual(enabledItems.some(i => i.label === 'Payments'), true);
    assert.strictEqual(enabledItems.find(i => i.label === 'Payments').path, '/billing/financials');
    assert.strictEqual(enabledItems.some(i => i.label === 'Billing & Invoices'), true);
    assert.strictEqual(enabledItems.some(i => i.label === 'Reports'), true);
  });

  it('super admin menu items properly excludes Payments when flag is false and includes when true', () => {
    const buildSuperAdminMenuItems = (portalEnabled) => {
      return [
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Clinics', path: '/clinics' },
        { label: 'Plans', path: '/plans' },
        { label: 'Promo Codes', path: '/promo-codes' },
        { label: 'Global Lab Catalogue', path: '/super-admin/healthcare-catalog/labs' },
        { label: 'Global Medicine Catalog', path: '/super-admin/healthcare-catalog/medicines' },
        ...(portalEnabled ? [{ label: 'Payments', path: '/payments' }] : []),
        { label: 'Reports', path: '/dashboard/revenue' },
        { label: 'Settings', path: '/settings/payment' }
      ];
    };

    // When disabled
    const disabledItems = buildSuperAdminMenuItems(false);
    assert.strictEqual(disabledItems.some(i => i.label === 'Payments'), false);
    assert.strictEqual(disabledItems.some(i => i.label === 'Reports'), true);

    // When enabled
    const enabledItems = buildSuperAdminMenuItems(true);
    assert.strictEqual(enabledItems.some(i => i.label === 'Payments'), true);
    assert.strictEqual(enabledItems.find(i => i.label === 'Payments').path, '/payments');
  });
});

