import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ROLES } from '../constants/roles.js';
import { ROUTES, NAV_ITEMS, getDefaultRouteForRole } from '../constants/routes.js';

describe('Super Admin & Role-based Routing Specifications', () => {
  it('SUPER_ADMIN default route must be /clinics', () => {
    const superAdminRoute = getDefaultRouteForRole(ROLES.SUPER_ADMIN);
    assert.equal(superAdminRoute, '/clinics', 'Super Admin must land on /clinics');
  });

  it('ADMIN (Clinic Admin) default route must remain /clinic/dashboard', () => {
    const adminRoute = getDefaultRouteForRole(ROLES.ADMIN);
    assert.equal(adminRoute, '/clinic/dashboard', 'Clinic Admin must land on /clinic/dashboard');
  });

  it('PATIENT default route must remain /portal', () => {
    const patientRoute = getDefaultRouteForRole(ROLES.PATIENT);
    assert.equal(patientRoute, '/portal');
  });

  it('RECEPTIONIST default route must remain /appointments', () => {
    const receptionistRoute = getDefaultRouteForRole(ROLES.RECEPTIONIST);
    assert.equal(receptionistRoute, '/appointments');
  });

  it('DOCTOR default route must resolve properly', () => {
    const doctorRoute = getDefaultRouteForRole(ROLES.DOCTOR);
    assert.equal(doctorRoute, '/dashboard');
  });

  it('NAV_ITEMS for SUPER_ADMIN should contain Platform Management items', () => {
    const superAdminItems = NAV_ITEMS.filter(item => item.roles.includes(ROLES.SUPER_ADMIN));
    const labels = superAdminItems.map(i => i.label);
    
    assert.ok(labels.includes('Clinics'), 'Clinics should be in Super Admin NAV_ITEMS');
    assert.ok(labels.includes('Plans'), 'Plans should be in Super Admin NAV_ITEMS');
    assert.ok(labels.includes('Promo Codes'), 'Promo Codes should be in Super Admin NAV_ITEMS');
    assert.ok(labels.includes('Global Lab Catalog'), 'Global Lab Catalog should be in Super Admin NAV_ITEMS');
    assert.ok(labels.includes('Global Medicine Catalog'), 'Global Medicine Catalog should be in Super Admin NAV_ITEMS');
    
    // Super Admin should not have operational clinic modules in NAV_ITEMS
    assert.ok(!labels.includes('Appointments'), 'Appointments should not be in Super Admin NAV_ITEMS');
    assert.ok(!labels.includes('Doctors'), 'Doctors should not be in Super Admin NAV_ITEMS');
    assert.ok(!labels.includes('Staff'), 'Staff should not be in Super Admin NAV_ITEMS');
  });

  it('Sidebar active matching logic accurately differentiates Super Admin pages', () => {
    // Replicate Sidebar.jsx isItemActive logic test
    const isItemActive = (role, item, pathname) => {
      const normRole = (role || '').toUpperCase();
      const path = item.path;
      const label = item.label;
      const menuKey = item.menuKey;

      if (normRole === 'SUPER_ADMIN') {
        if (menuKey === 'globalLabCatalog' || label === 'Global Lab Catalogue') {
          return (pathname.startsWith('/super-admin/healthcare-catalog') && !pathname.includes('/medicines')) ||
                 pathname === '/global-lab-catalogue' || pathname === '/global-lab-catalog';
        }
        if (label === 'Global Medicine Catalog' || path === '/super-admin/healthcare-catalog/medicines' || path === '/global-medicine-catalogue') {
          return pathname === '/super-admin/healthcare-catalog/medicines' || pathname === '/global-medicine-catalogue' || pathname === '/global-medicine-catalog';
        }
        if (path.startsWith('/super-admin/healthcare-catalog/')) {
          return pathname === path;
        }
        if (label === 'Clinics' || path === '/clinics' || path === '/super-admin/clinics') {
          return pathname.startsWith('/super-admin/clinics') || pathname === '/clinics' || pathname.startsWith('/clinics/') || pathname === '/admin/clinics-dashboard';
        }
        if (label === 'Plans' || path === '/plans' || path === '/super-admin/plans') {
          return pathname.startsWith('/super-admin/plans') || pathname === '/plans' || pathname.startsWith('/plans/');
        }
        if (label === 'Promo Codes' || path === '/promo-codes' || path === '/super-admin/promo-codes') {
          return pathname.startsWith('/super-admin/promo-codes') || pathname === '/promo-codes' || pathname.startsWith('/promo-codes/');
        }
      }

      if (label === 'Dashboard' || path === '/dashboard' || path === '/clinic/dashboard') {
        return pathname === '/dashboard' || pathname === '/clinic/dashboard' || pathname === '/';
      }

      return pathname === path || (path !== '/' && pathname.startsWith(path + '/'));
    };

    const clinicsItem = { label: 'Clinics', path: '/clinics' };
    const plansItem = { label: 'Plans', path: '/plans' };
    const promoCodesItem = { label: 'Promo Codes', path: '/promo-codes' };
    const labCatItem = { label: 'Global Lab Catalogue', path: '/super-admin/healthcare-catalog/labs', menuKey: 'globalLabCatalog' };
    const medCatItem = { label: 'Global Medicine Catalog', path: '/super-admin/healthcare-catalog/medicines' };
    const dashboardItem = { label: 'Dashboard', path: '/clinic/dashboard' };

    // When on /clinics
    assert.equal(isItemActive(ROLES.SUPER_ADMIN, clinicsItem, '/clinics'), true, 'Clinics item should be active on /clinics');
    assert.equal(isItemActive(ROLES.SUPER_ADMIN, plansItem, '/clinics'), false, 'Plans item should not be active on /clinics');
    assert.equal(isItemActive(ROLES.SUPER_ADMIN, dashboardItem, '/clinics'), false, 'Dashboard item should not be active on /clinics');

    // When on /plans
    assert.equal(isItemActive(ROLES.SUPER_ADMIN, plansItem, '/plans'), true, 'Plans item should be active on /plans');
    assert.equal(isItemActive(ROLES.SUPER_ADMIN, clinicsItem, '/plans'), false, 'Clinics item should not be active on /plans');

    // When on /promo-codes
    assert.equal(isItemActive(ROLES.SUPER_ADMIN, promoCodesItem, '/promo-codes'), true, 'Promo Codes should be active on /promo-codes');

    // When on /global-lab-catalogue
    assert.equal(isItemActive(ROLES.SUPER_ADMIN, labCatItem, '/global-lab-catalogue'), true, 'Global Lab Catalog should be active on /global-lab-catalogue');

    // When on /global-medicine-catalogue
    assert.equal(isItemActive(ROLES.SUPER_ADMIN, medCatItem, '/global-medicine-catalogue'), true, 'Global Medicine Catalog should be active on /global-medicine-catalogue');

    // Clinic Admin on /clinic/dashboard
    assert.equal(isItemActive(ROLES.ADMIN, dashboardItem, '/clinic/dashboard'), true, 'Dashboard item should be active for ADMIN on /clinic/dashboard');
  });
});
