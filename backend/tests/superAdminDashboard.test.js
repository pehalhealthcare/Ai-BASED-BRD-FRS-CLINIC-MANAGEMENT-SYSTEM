const request = require('supertest');
const { ROLES } = require('../src/common/constants/roles');
const { createUserWithClinic, getAuthHeaders } = require('./helpers/phase3.helper');

let app;
let Clinic;
let SubscriptionPlan;

beforeAll(() => {
  app = require('../src/app');
  Clinic = require('../src/modules/clinics/clinic.model');
  SubscriptionPlan = require('../src/modules/subscriptions/subscriptionPlan.model');
});

describe('Super Admin Dashboard & Global Search', () => {
  let superAdmin;

  beforeEach(async () => {
    superAdmin = await createUserWithClinic({ role: ROLES.SUPER_ADMIN });

    let plan = await SubscriptionPlan.findOne({ code: 'BASIC' });
    if (!plan) {
      plan = await SubscriptionPlan.create({
        name: `AI Basic ClinicOS ${Date.now()}`,
        code: `BASIC${Date.now()}`,
        price: 2499,
        features: ['Basic']
      });
    }

    // Seed test clinics
    await Clinic.create([
      {
        name: 'Alpha Health Clinic',
        code: `ALPHA${Date.now()}`,
        approvalStatus: 'approved',
        isActive: true,
        subscription: {
          planId: plan._id,
          status: 'Active',
          expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
        },
        ownerDetails: { name: 'Dr. Alpha', email: `alpha${Date.now()}@test.com` }
      }
    ]);
  });

  it('1. GET /api/v1/dashboard/super-admin/dashboard returns accurate platform metrics', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/super-admin/dashboard')
      .set(getAuthHeaders(superAdmin.token));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.metrics.totalClinics).toBeGreaterThanOrEqual(1);
    expect(res.body.data.charts.registrations.length).toBeGreaterThan(0);
    expect(res.body.data.charts.statusDistribution.total).toBeGreaterThanOrEqual(1);
  });

  it('2. GET /api/v1/dashboard/super-admin/search finds clinics and payments by keyword', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/super-admin/search?q=Alpha')
      .set(getAuthHeaders(superAdmin.token));

    expect(res.status).toBe(200);
    expect(res.body.data.clinics.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.clinics[0].title).toContain('Alpha Health Clinic');
  });
});
