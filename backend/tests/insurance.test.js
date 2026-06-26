const mongoose = require('mongoose');
const request = require('supertest');
const { ROLES } = require('../src/common/constants/roles');

let app;
let InsuranceProvider;
let PatientInsurance;
let InsuranceClaim;
let Patient;
let Clinic;
let Invoice;
let User;

beforeAll(() => {
  app = require('../src/app');
  InsuranceProvider = require('../src/modules/insurance/schemas/provider.schema');
  PatientInsurance = require('../src/modules/insurance/schemas/policy.schema');
  InsuranceClaim = require('../src/modules/insurance/schemas/claim.schema');
  Patient = require('../src/modules/patients/patient.model');
  Clinic = require('../src/modules/clinics/clinic.model');
  Invoice = require('../src/modules/billing/invoice.model');
  User = require('../src/modules/users/user.model');
});

describe('Insurance Module Test Suite', () => {
  let adminToken;
  let patientToken;
  let provider;
  let patient;
  let clinic;
  let invoice;
  let policy;

  beforeEach(async () => {
    // Prevent duplicate key errors by clearing collections beforehand
    await User.deleteMany({});
    await Clinic.deleteMany({});
    await Patient.deleteMany({});
    await InsuranceProvider.deleteMany({});
    await PatientInsurance.deleteMany({});
    await InsuranceClaim.deleteMany({});
    await Invoice.deleteMany({});

    // Create Admin user in DB
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'AdminPassword123!',
      role: ROLES.ADMIN,
      isActive: true
    });

    // Login Admin
    const adminLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@example.com',
      password: 'AdminPassword123!'
    });
    adminToken = adminLoginRes.body.data.accessToken;

    // Create Patient user in DB
    const patientUser = await User.create({
      name: 'Jane Doe',
      email: 'janedoe@example.com',
      password: 'PatientPassword123!',
      role: ROLES.PATIENT,
      isActive: true
    });

    // Login Patient
    const patientLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'janedoe@example.com',
      password: 'PatientPassword123!'
    });
    patientToken = patientLoginRes.body.data.accessToken;

    // Create Clinic
    clinic = await Clinic.create({
      name: 'Test Clinic',
      code: 'CLINIC01',
      email: 'testclinic@example.com',
      phone: '1234567890',
      address: { line1: '123 Test St', city: 'Test City', state: 'TS', pincode: '123456', country: 'India' },
      isActive: true
    });

    // Create Patient
    patient = await Patient.create({
      userId: patientUser._id,
      patientId: 'PAT-999999',
      firstName: 'Jane',
      lastName: 'Doe',
      fullName: 'Jane Doe',
      email: 'janedoe@example.com',
      phone: '9876543210',
      clinicId: clinic._id,
      age: 30,
      gender: 'female',
      createdBy: adminUser._id,
      isActive: true
    });

    // Create Provider
    provider = await InsuranceProvider.create({
      providerCode: 'STAR',
      providerName: 'Star Health Insurance',
      logo: 'logo.png',
      contactEmail: 'contact@star.com',
      contactPhone: '1800-111-222',
      website: 'star.com',
      supportedClaimTypes: ['consultation', 'lab', 'hospitalization', 'emergency']
    });

    // Create Invoice
    invoice = await Invoice.create({
      invoiceNumber: 'INV-000001',
      clinicId: clinic._id,
      patientId: patient._id,
      billingDate: new Date(),
      dueDate: new Date(),
      items: [{ name: 'Consultation', quantity: 1, unitPrice: 1500, amount: 1500 }],
      totalAmount: 1500,
      taxAmount: 0,
      discountAmount: 0,
      paidAmount: 0,
      dueAmount: 1500,
      paymentStatus: 'unpaid',
      createdBy: adminUser._id
    });

    // Create Policy
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    policy = await PatientInsurance.create({
      patientId: patient._id,
      providerId: provider._id,
      policyNumber: 'STAR00009999',
      memberId: 'MEM-111222',
      groupId: 'GRP-333444',
      policyHolderName: 'Jane Doe',
      relationship: 'Self',
      policyStartDate: startDate,
      policyEndDate: endDate,
      coverageAmount: 200000,
      remainingCoverage: 200000,
      status: 'ACTIVE',
      benefits: {
        consultation: true,
        lab: true,
        pharmacy: false,
        hospitalization: true,
        roomRent: true,
        surgery: true,
        emergency: true
      }
    });
  });

  describe('GET /api/v1/insurance/providers', () => {
    it('should retrieve list of all insurance providers', async () => {
      const res = await request(app)
        .get('/api/v1/insurance/providers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.providers).toBeDefined();
      expect(res.body.data.providers.length).toBeGreaterThan(0);
      expect(res.body.data.providers[0].providerCode).toBe('STAR');
    });
  });

  describe('POST /api/v1/insurance/verify', () => {
    it('should verify a valid policy successfully', async () => {
      const res = await request(app)
        .post('/api/v1/insurance/verify')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          providerCode: 'STAR',
          policyNumber: 'STAR00009999'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.valid).toBe(true);
      expect(res.body.data.status).toBe('ACTIVE');
      expect(res.body.data.policyHolder).toBe('Jane Doe');
    });

    it('should return valid: false for a non-existent policy', async () => {
      const res = await request(app)
        .post('/api/v1/insurance/verify')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          providerCode: 'STAR',
          policyNumber: 'INVALID_NUMBER_XYZ'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.valid).toBe(false);
      expect(res.body.data.status).toBe('INVALID');
    });
  });

  describe('GET /api/v1/insurance/coverage/:policyNumber', () => {
    it('should retrieve coverage benefits for a valid policy', async () => {
      const res = await request(app)
        .get(`/api/v1/insurance/coverage/STAR00009999`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.consultation).toBe(true);
      expect(res.body.data.pharmacy).toBe(false);
      expect(res.body.data.remainingCoverage).toBe(200000);
    });
  });

  describe('POST /api/v1/insurance/claim', () => {
    it('should submit a valid claim and return a sequential CLAIM-XXXXXX id', async () => {
      const res = await request(app)
        .post('/api/v1/insurance/claim')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: patient._id.toString(),
          invoiceId: invoice._id.toString(),
          policyNumber: 'STAR00009999',
          clinicId: clinic._id.toString(),
          claimAmount: 1500
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.claim.claimId).toMatch(/^CLAIM-\d{6}$/);
      expect(res.body.data.claim.status).toBe('PENDING');
      expect(res.body.data.claim.claimAmount).toBe(1500);
    });
  });

  describe('PUT /api/v1/insurance/claim/:claimId/approve', () => {
    it('should approve a pending claim and deduct approved amount from remaining policy coverage', async () => {
      // Submit claim first
      const claim = await InsuranceClaim.create({
        claimId: 'CLAIM-999999',
        patientId: patient._id,
        invoiceId: invoice._id,
        policyNumber: 'STAR00009999',
        clinicId: clinic._id,
        claimAmount: 10000,
        status: 'PENDING'
      });

      const res = await request(app)
        .put(`/api/v1/insurance/claim/CLAIM-999999/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          approvedAmount: 8500
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.claim.status).toBe('APPROVED');
      expect(res.body.data.claim.approvedAmount).toBe(8500);

      // Verify policy balance decremented
      const updatedPolicy = await PatientInsurance.findById(policy._id);
      expect(updatedPolicy.remainingCoverage).toBe(200000 - 8500);
    });
  });

  describe('PUT /api/v1/insurance/claim/:claimId/reject', () => {
    it('should reject a claim and save rejection reason', async () => {
      const claim = await InsuranceClaim.create({
        claimId: 'CLAIM-888888',
        patientId: patient._id,
        invoiceId: invoice._id,
        policyNumber: 'STAR00009999',
        clinicId: clinic._id,
        claimAmount: 10000,
        status: 'PENDING'
      });

      const res = await request(app)
        .put(`/api/v1/insurance/claim/CLAIM-888888/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rejectionReason: 'Diagnosis is not covered under general health clause.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.claim.status).toBe('REJECTED');
      expect(res.body.data.claim.rejectionReason).toBe('Diagnosis is not covered under general health clause.');
    });
  });

  describe('Patient Insurance Policy CRUD', () => {
    it('should allow linking a policy to a patient', async () => {
      // Clear policy created in beforeEach to test post link
      await PatientInsurance.deleteMany({});

      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);

      const res = await request(app)
        .post(`/api/v1/patients/${patient._id}/insurance`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          providerId: provider._id.toString(),
          policyNumber: 'NIVA77777777',
          memberId: 'MEM-777888',
          policyHolderName: 'Jane Doe',
          relationship: 'Self',
          policyStartDate: startDate.toISOString(),
          policyEndDate: endDate.toISOString(),
          coverageAmount: 500000
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.policy.policyNumber).toBe('NIVA77777777');
    });

    it('should allow retrieving patient linked policy', async () => {
      const res = await request(app)
        .get(`/api/v1/patients/${patient._id}/insurance`)
        .set('Authorization', `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.policy.policyNumber).toBe('STAR00009999');
    });

    it('should allow deleting/unlinking policy', async () => {
      const res = await request(app)
        .delete(`/api/v1/patients/${patient._id}/insurance`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const deleted = await PatientInsurance.findOne({ patientId: patient._id });
      expect(deleted).toBeNull();
    });
  });
});
