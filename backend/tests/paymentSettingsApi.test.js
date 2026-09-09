const request = require('supertest');
const { ROLES } = require('../src/common/constants/roles');
const { createUserWithClinic, getAuthHeaders } = require('./helpers/phase3.helper');

let app;

beforeAll(() => {
  app = require('../src/app');
});

describe('Payment Settings API & RBAC Integration Tests', () => {
  let superAdmin;
  let clinicAdmin;
  let doctor;

  beforeEach(async () => {
    superAdmin = await createUserWithClinic({ role: ROLES.SUPER_ADMIN });
    clinicAdmin = await createUserWithClinic({ role: ROLES.ADMIN });
    doctor = await createUserWithClinic({ role: ROLES.DOCTOR });
  });

  describe('GET /api/v1/admin/payment-settings (Super Admin Only)', () => {
    test('Allows Super Admin to fetch decrypted payment settings & history', async () => {
      const res = await request(app)
        .get('/api/v1/admin/payment-settings')
        .set(getAuthHeaders(superAdmin.token));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.paymentSettings).toBeDefined();
      expect(res.body.data.paymentSettings.accountName).toBe('PehalHealthcare Technologies Private Limited');
      expect(res.body.data.paymentSettings.bankName).toBe('Kotak Mahindra Bank');
      expect(res.body.data.paymentSettings.accountNumber).toBe('8512060314');
      expect(res.body.data.paymentSettings.ifscCode).toBe('KKBK0000181');
      expect(res.body.data.paymentSettings.upiId).toBe('8130916134@kotak');
      expect(res.body.data.paymentSettings.version).toBe(1);
      expect(res.body.data.recentChanges).toBeDefined();
    });

    test('Rejects Clinic Admin with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/payment-settings')
        .set(getAuthHeaders(clinicAdmin.token));

      expect(res.status).toBe(403);
    });

    test('Rejects Doctor with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/payment-settings')
        .set(getAuthHeaders(doctor.token));

      expect(res.status).toBe(403);
    });

    test('Rejects Unauthenticated Request with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/admin/payment-settings');
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/v1/admin/payment-settings (Super Admin Only)', () => {
    test('Allows Super Admin to update bank & UPI settings with automatic versioning', async () => {
      const updatePayload = {
        accountName: 'PehalHealthcare Technologies Private Limited',
        bankName: 'Kotak Mahindra Bank',
        accountNumber: '8512060314',
        ifscCode: 'KKBK0000181',
        branch: 'Sector-18, Noida',
        upiId: 'pehalpay@kotak'
      };

      const res = await request(app)
        .put('/api/v1/admin/payment-settings')
        .set(getAuthHeaders(superAdmin.token))
        .send(updatePayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.paymentSettings.upiId).toBe('pehalpay@kotak');
      expect(res.body.data.paymentSettings.version).toBe(2);
    });

    test('Rejects invalid IFSC code with 400 Bad Request', async () => {
      const invalidPayload = {
        accountName: 'PehalHealthcare Technologies Private Limited',
        bankName: 'Kotak Mahindra Bank',
        accountNumber: '8512060314',
        ifscCode: 'INVALID_IFSC',
        branch: 'Sector-18, Noida',
        upiId: 'pehal@kotak'
      };

      const res = await request(app)
        .put('/api/v1/admin/payment-settings')
        .set(getAuthHeaders(superAdmin.token))
        .send(invalidPayload);

      expect(res.status).toBe(400);
    });

    test('Rejects invalid UPI ID with 400 Bad Request', async () => {
      const invalidPayload = {
        accountName: 'PehalHealthcare Technologies Private Limited',
        bankName: 'Kotak Mahindra Bank',
        accountNumber: '8512060314',
        ifscCode: 'KKBK0000181',
        branch: 'Sector-18, Noida',
        upiId: 'invalid-upi-no-at-sign'
      };

      const res = await request(app)
        .put('/api/v1/admin/payment-settings')
        .set(getAuthHeaders(superAdmin.token))
        .send(invalidPayload);

      expect(res.status).toBe(400);
    });

    test('Rejects Clinic Admin modification attempts with 403 Forbidden', async () => {
      const res = await request(app)
        .put('/api/v1/admin/payment-settings')
        .set(getAuthHeaders(clinicAdmin.token))
        .send({
          accountName: 'Malicious Name',
          bankName: 'Malicious Bank',
          accountNumber: '9999999999',
          ifscCode: 'KKBK0000181',
          branch: 'Noida',
          upiId: 'hacker@upi'
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/payment-details (Clinic-Facing Sanitized Endpoint)', () => {
    test('Returns only active sanitized payment details without internal metadata or secrets', async () => {
      const res = await request(app).get('/api/v1/payment-details');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const details = res.body.data.paymentDetails;
      expect(details).toBeDefined();
      expect(details.accountName).toBe('PehalHealthcare Technologies Private Limited');
      expect(details.bankName).toBe('Kotak Mahindra Bank');
      expect(details.accountNumber).toBe('8512060314');
      expect(details.ifscCode).toBe('KKBK0000181');
      expect(details.branch).toBe('Sector-18, Noida');

      // Must NOT leak internal DB IDs, versioning, audit history, or encryption fields
      expect(details._id).toBeUndefined();
      expect(details.version).toBeUndefined();
      expect(details.accountNameEncrypted).toBeUndefined();
      expect(details.recentChanges).toBeUndefined();
    });
  });
});
