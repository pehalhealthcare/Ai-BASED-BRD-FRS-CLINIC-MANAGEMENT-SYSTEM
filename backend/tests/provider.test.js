const request = require('supertest');
const mongoose = require('mongoose');

describe('Healthcare Provider Management Module', () => {
  let app;
  let Provider;
  let CatalogCategory;
  let Clinic;
  let User;
  let ROLES;

  let dbConnection;
  let adminToken;
  let superAdminToken;
  let doctorToken;
  let clinicId;
  let adminUserId;

  const mockAdminUser = {
    name: 'Clinic Admin User',
    email: 'admin@clinic.com',
    password: 'StrongPass123!',
    role: 'ADMIN',
    isActive: true
  };

  const mockDoctorUser = {
    name: 'Clinic Doctor User',
    email: 'doctor@clinic.com',
    password: 'StrongPass123!',
    role: 'DOCTOR',
    isActive: true
  };

  beforeEach(async () => {
    app = require('../src/app');
    Provider = require('../src/modules/providers/provider.model');
    CatalogCategory = require('../src/modules/healthcare-catalog/catalogCategory.model');
    Clinic = require('../src/modules/clinics/clinic.model');
    User = require('../src/modules/users/user.model');
    ROLES = require('../src/common/constants/roles').ROLES;

    dbConnection = mongoose.connection;

    // Explicitly clean up to avoid E11000 duplicate keys
    await Clinic.deleteMany({});
    await User.deleteMany({});
    await Provider.deleteMany({});

    // Create a mock clinic
    const clinic = await Clinic.create({
      name: 'Indirapuram Test Clinic',
      code: 'INDTEST',
      approvalStatus: 'approved',
      address: {
        line1: '123 Test Street',
        city: 'Ghaziabad',
        state: 'Uttar Pradesh',
        pincode: '201014'
      }
    });
    clinicId = clinic._id;

    // Create Admin User
    const admin = await User.create({
      ...mockAdminUser,
      clinicId,
      approvalStatus: 'approved',
      isEmailVerified: true
    });
    adminUserId = admin._id;

    // Create Doctor User
    const doctor = await User.create({
      ...mockDoctorUser,
      clinicId,
      approvalStatus: 'approved',
      isEmailVerified: true
    });

    // Login users to get tokens
    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: mockAdminUser.email, password: mockAdminUser.password });
    adminToken = adminLogin.body.data.accessToken;

    const doctorLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: mockDoctorUser.email, password: mockDoctorUser.password });
    doctorToken = doctorLogin.body.data.accessToken;
  });

  afterAll(async () => {
    await Provider.deleteMany({});
    await Clinic.deleteMany({});
    await User.deleteMany({});
  });

  describe('Authorization Checks', () => {
    it('denies access to non-Admin roles (e.g. Doctor) for registering providers', async () => {
      const res = await request(app)
        .post('/api/v1/providers')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          name: 'Doctor Prohibited Lab',
          providerType: 'Laboratory',
          providerSubtype: 'Internal',
          providerCategory: 'Own Provider',
          contactPerson: 'Manager',
          phone: '9999999999',
          email: 'prohibited@test.com',
          address: {
            line1: 'Flat 1',
            city: 'Ghaziabad',
            state: 'UP',
            country: 'India',
            pincode: '201014'
          }
        });

      expect(res.status).toBe(403);
    });

    it('allows Clinic Admin to access provider lists', async () => {
      const res = await request(app)
        .get('/api/v1/providers')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toBeDefined();
    });
  });

  describe('Provider CRUD Workflows', () => {
    const createTestProvider = async (name = 'Indirapuram Pharmacy 1') => {
      return Provider.create({
        globalId: 'PRV-000001',
        clinicId,
        name,
        providerType: 'Pharmacy',
        providerSubtype: 'Internal',
        providerCategory: 'Own Provider',
        contactPerson: 'Suresh Kumar',
        phone: '9876543210',
        email: 'suresh@pharmacy.com',
        address: {
          line1: 'Shop G5, Indirapuram Mall',
          city: 'Ghaziabad',
          state: 'Uttar Pradesh',
          country: 'India',
          pincode: '201014'
        },
        services: {
          walkInPurchase: true,
          homeDelivery: true
        },
        createdBy: adminUserId
      });
    };

    it('successfully registers a pharmacy provider and generates a sequential ID', async () => {
      const res = await request(app)
        .post('/api/v1/providers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Indirapuram Pharmacy 1',
          providerType: 'Pharmacy',
          providerSubtype: 'Internal',
          providerCategory: 'Own Provider',
          contactPerson: 'Suresh Kumar',
          phone: '9876543210',
          email: 'suresh@pharmacy.com',
          address: {
            line1: 'Shop G5, Indirapuram Mall',
            city: 'Ghaziabad',
            state: 'Uttar Pradesh',
            country: 'India',
            pincode: '201014'
          },
          services: {
            walkInPurchase: true,
            homeDelivery: true
          }
        });

      expect(res.status).toBe(201);
      expect(res.body.data.globalId).toMatch(/^PRV-\d{6}$/);
      expect(res.body.data.name).toBe('Indirapuram Pharmacy 1');
    });

    it('prevents registering duplicate provider name within the same clinic', async () => {
      await createTestProvider('Indirapuram Pharmacy 1');

      const res = await request(app)
        .post('/api/v1/providers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Indirapuram Pharmacy 1',
          providerType: 'Pharmacy',
          providerSubtype: 'External',
          providerCategory: 'Partner Provider',
          contactPerson: 'Ramesh Singh',
          phone: '9998887776',
          email: 'ramesh@pharmacy.com',
          address: {
            line1: 'Shop G5, Indirapuram Mall',
            city: 'Ghaziabad',
            state: 'Uttar Pradesh',
            country: 'India',
            pincode: '201014'
          }
        });

      expect(res.status).toBe(409);
    });

    it('successfully retrieves single provider details', async () => {
      const p = await createTestProvider();

      const res = await request(app)
        .get(`/api/v1/providers/${p._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Indirapuram Pharmacy 1');
      expect(res.body.data.services.homeDelivery).toBe(true);
    });

    it('successfully updates provider details', async () => {
      const p = await createTestProvider();

      const res = await request(app)
        .put(`/api/v1/providers/${p._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Indirapuram Pharmacy 1 Updated',
          contactPerson: 'Suresh Kumar Gupta'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Indirapuram Pharmacy 1 Updated');
      expect(res.body.data.contactPerson).toBe('Suresh Kumar Gupta');
    });

    it('successfully modifies status via PATCH endpoint', async () => {
      const p = await createTestProvider();

      const res = await request(app)
        .patch(`/api/v1/providers/${p._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Inactive' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Inactive');
    });

    it('archives provider (soft-deletes) via DELETE route', async () => {
      const p = await createTestProvider();

      const res = await request(app)
        .delete(`/api/v1/providers/${p._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Archived');

      // Verify that it is omitted from default search queries
      const getRes = await request(app)
        .get('/api/v1/providers')
        .set('Authorization', `Bearer ${adminToken}`);

      const found = getRes.body.data.items.find(item => item._id === p._id.toString());
      expect(found).toBeUndefined();
    });
  });

  describe('Clinic Branches Retrieval', () => {
    it('returns the main clinic and associated sub-branches', async () => {
      const res = await request(app)
        .get('/api/v1/providers/branches')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Indirapuram Test Clinic');
    });
  });
});
