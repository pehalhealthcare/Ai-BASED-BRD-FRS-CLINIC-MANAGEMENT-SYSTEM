const request = require('supertest');
const { ROLES } = require('../src/common/constants/roles');
const { createUserWithClinic, getAuthHeaders } = require('./helpers/phase3.helper');

let app;
let Clinic;
let SubscriptionPayment;
let SubscriptionPlan;

beforeAll(() => {
  app = require('../src/app');
  Clinic = require('../src/modules/clinics/clinic.model');
  SubscriptionPayment = require('../src/modules/payment/models/subscriptionPayment.model');
  SubscriptionPlan = require('../src/modules/subscriptions/subscriptionPlan.model');
});

describe('Subscription Payment & Verification Lifecycle', () => {
  let superAdmin;
  let clinicAdmin;
  let testPlan;
  let testClinic;

  beforeEach(async () => {
    superAdmin = await createUserWithClinic({ role: ROLES.SUPER_ADMIN });
    clinicAdmin = await createUserWithClinic({ role: ROLES.ADMIN });
    testClinic = clinicAdmin.clinic;

    testPlan = await SubscriptionPlan.create({
      name: `AI Enterprise ClinicOS ${Date.now()}`,
      code: `ENT${Date.now()}`,
      price: 9999,
      priceMonthly: 9999,
      priceYearly: 99990,
      features: ['All Features']
    });
  });

  it('1. Clinic Admin submits payment attempt #1 with valid UTR', async () => {
    const res = await request(app)
      .post('/api/v1/subscription/submit')
      .set(getAuthHeaders(clinicAdmin.token))
      .send({
        clinicId: testClinic._id,
        planId: testPlan._id,
        billingCycle: 'monthly',
        utr: 'UTR9384756201',
        transactionId: 'TXN9384756201'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.payment.utr).toBe('UTR9384756201');
    expect(res.body.data.payment.amount).toBe(9999);
    expect(res.body.data.payment.attemptNumber).toBe(1);
    expect(res.body.data.payment.status).toBe('PENDING_VERIFICATION');
  });

  it('2. Prevents duplicate UTR submission', async () => {
    await request(app)
      .post('/api/v1/subscription/submit')
      .set(getAuthHeaders(clinicAdmin.token))
      .send({
        clinicId: testClinic._id,
        planId: testPlan._id,
        billingCycle: 'monthly',
        utr: 'UTR9384756201'
      });

    const res = await request(app)
      .post('/api/v1/subscription/submit')
      .set(getAuthHeaders(clinicAdmin.token))
      .send({
        clinicId: testClinic._id,
        planId: testPlan._id,
        billingCycle: 'monthly',
        utr: 'UTR9384756201'
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already been submitted/i);
  });

  it('3. Super Admin lists payments and sees the pending attempt', async () => {
    await request(app)
      .post('/api/v1/subscription/submit')
      .set(getAuthHeaders(clinicAdmin.token))
      .send({
        clinicId: testClinic._id,
        planId: testPlan._id,
        billingCycle: 'monthly',
        utr: 'UTR9384756202'
      });

    const res = await request(app)
      .get('/api/v1/admin/payments?status=PENDING_VERIFICATION')
      .set(getAuthHeaders(superAdmin.token));

    expect(res.status).toBe(200);
    expect(res.body.data.payments.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.counts.pending).toBeGreaterThanOrEqual(1);
  });

  it('4. Super Admin rejects payment attempt #1 with mandatory reason -> clinic moves to Repayment Required', async () => {
    const submitRes = await request(app)
      .post('/api/v1/subscription/submit')
      .set(getAuthHeaders(clinicAdmin.token))
      .send({
        clinicId: testClinic._id,
        planId: testPlan._id,
        billingCycle: 'monthly',
        utr: 'UTR9384756203'
      });

    const paymentId = submitRes.body.data.payment._id;

    const res = await request(app)
      .post(`/api/v1/admin/payments/${paymentId}/reject`)
      .set(getAuthHeaders(superAdmin.token))
      .send({
        reason: 'UTR could not be verified with Kotak Bank records',
        notes: 'Please double check the 12-digit reference number'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.payment.status).toBe('REJECTED');
    expect(res.body.data.payment.rejectionReason).toContain('UTR could not be verified');

    const clinic = await Clinic.findById(testClinic._id);
    expect(clinic.rejectionReason).toContain('Payment Rejected');
  });

  it('5. Repayment flow: Clinic Admin submits payment attempt #2 with new UTR (Attempt #1 history is preserved)', async () => {
    const submit1 = await request(app)
      .post('/api/v1/subscription/submit')
      .set(getAuthHeaders(clinicAdmin.token))
      .send({
        clinicId: testClinic._id,
        planId: testPlan._id,
        billingCycle: 'monthly',
        utr: 'UTR9384756204'
      });

    await request(app)
      .post(`/api/v1/admin/payments/${submit1.body.data.payment._id}/reject`)
      .set(getAuthHeaders(superAdmin.token))
      .send({ reason: 'Amount mismatch' });

    const res = await request(app)
      .post('/api/v1/subscription/submit')
      .set(getAuthHeaders(clinicAdmin.token))
      .send({
        clinicId: testClinic._id,
        planId: testPlan._id,
        billingCycle: 'monthly',
        utr: 'UTR9384756205'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.payment.attemptNumber).toBe(2);
    expect(res.body.data.payment.status).toBe('PENDING_VERIFICATION');

    const attempt1 = await SubscriptionPayment.findOne({ utr: 'UTR9384756204' });
    expect(attempt1.status).toBe('REJECTED');
    expect(attempt1.attemptNumber).toBe(1);
  });

  it('6. Super Admin verifies payment attempt #2 -> Clinic and User are activated', async () => {
    const submitRes = await request(app)
      .post('/api/v1/subscription/submit')
      .set(getAuthHeaders(clinicAdmin.token))
      .send({
        clinicId: testClinic._id,
        planId: testPlan._id,
        billingCycle: 'monthly',
        utr: 'UTR9384756206'
      });

    const paymentId = submitRes.body.data.payment._id;

    const res = await request(app)
      .post(`/api/v1/admin/payments/${paymentId}/verify`)
      .set(getAuthHeaders(superAdmin.token));

    expect(res.status).toBe(200);
    expect(res.body.data.payment.status).toBe('VERIFIED');

    const updatedClinic = await Clinic.findById(testClinic._id);
    expect(updatedClinic.subscription.status).toBe('Active');
    expect(updatedClinic.approvalStatus).toBe('approved');
    expect(updatedClinic.isActive).toBe(true);
    expect(updatedClinic.subscription.expiryDate).toBeTruthy();
  });

  it('7. Clinic 360° payment history endpoint returns attempts', async () => {
    await request(app)
      .post('/api/v1/subscription/submit')
      .set(getAuthHeaders(clinicAdmin.token))
      .send({
        clinicId: testClinic._id,
        planId: testPlan._id,
        billingCycle: 'monthly',
        utr: 'UTR9384756207'
      });

    const res = await request(app)
      .get(`/api/v1/subscription/history/${testClinic._id}`)
      .set(getAuthHeaders(superAdmin.token));

    expect(res.status).toBe(200);
    expect(res.body.data.payments.length).toBe(1);
    expect(res.body.data.summary.hasPending).toBe(true);
  });

  it('8. RBAC: Non-superadmin cannot verify payments (403 Forbidden)', async () => {
    const submitRes = await request(app)
      .post('/api/v1/subscription/submit')
      .set(getAuthHeaders(clinicAdmin.token))
      .send({
        clinicId: testClinic._id,
        planId: testPlan._id,
        billingCycle: 'monthly',
        utr: 'UTR9384756208'
      });

    const paymentId = submitRes.body.data.payment._id;

    const res = await request(app)
      .post(`/api/v1/admin/payments/${paymentId}/verify`)
      .set(getAuthHeaders(clinicAdmin.token));

    expect(res.status).toBe(403);
  });
});
