const request = require('supertest');
const mongoose = require('mongoose');

describe('Healthcare Provider Catalog Mapping Engine', () => {
  let app;
  let Provider;
  let ProviderMapping;
  let GlobalMedicine;
  let GlobalLabTest;
  let CatalogCategory;
  let Clinic;
  let User;

  let dbConnection;
  let adminToken;
  let doctorToken;
  let clinicId;
  let providerId;
  let globalMedicineId;
  let globalLabTestId;
  let adminUserId;

  const mockAdminUser = {
    name: 'Mapping Admin User',
    email: 'admin@mapping.com',
    password: 'StrongPass123!',
    role: 'ADMIN',
    isActive: true
  };

  const mockDoctorUser = {
    name: 'Mapping Doctor User',
    email: 'doctor@mapping.com',
    password: 'StrongPass123!',
    role: 'DOCTOR',
    isActive: true
  };

  beforeEach(async () => {
    app = require('../src/app');
    Provider = require('../src/modules/providers/provider.model');
    ProviderMapping = require('../src/modules/providers/providerMapping.model');
    GlobalMedicine = require('../src/modules/healthcare-catalog/globalMedicine.model');
    GlobalLabTest = require('../src/modules/healthcare-catalog/globalLabTest.model');
    CatalogCategory = require('../src/modules/healthcare-catalog/catalogCategory.model');
    Clinic = require('../src/modules/clinics/clinic.model');
    User = require('../src/modules/users/user.model');

    dbConnection = mongoose.connection;

    // Explicit purges to bypass E11000 duplicate keys
    await Clinic.deleteMany({});
    await User.deleteMany({});
    await Provider.deleteMany({});
    await ProviderMapping.deleteMany({});
    await GlobalMedicine.deleteMany({});
    await GlobalLabTest.deleteMany({});
    await CatalogCategory.deleteMany({});

    // Seed Clinic
    const clinic = await Clinic.create({
      name: 'Mapping Test Clinic',
      code: 'MAPCLINIC',
      approvalStatus: 'approved',
      address: {
        line1: '123 Map Street',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001'
      }
    });
    clinicId = clinic._id;

    // Seed Admin
    const admin = await User.create({
      ...mockAdminUser,
      clinicId,
      approvalStatus: 'approved',
      isEmailVerified: true
    });
    adminUserId = admin._id;

    // Seed Doctor
    const doctor = await User.create({
      ...mockDoctorUser,
      clinicId,
      approvalStatus: 'approved',
      isEmailVerified: true
    });

    // Seed Provider
    const provider = await Provider.create({
      globalId: 'PRV-888888',
      clinicId,
      name: 'Seeded Pharmacy Provider',
      providerType: 'Pharmacy',
      providerSubtype: 'Internal',
      providerCategory: 'Own Provider',
      contactPerson: 'Manager',
      phone: '9999999999',
      email: 'pharmacy@seeded.com',
      address: {
        line1: 'G1 Seed Road',
        city: 'Delhi',
        state: 'Delhi',
        country: 'India',
        pincode: '110001'
      },
      createdBy: adminUserId
    });
    providerId = provider._id;

    // Seed Categories
    const medicineCategory = await CatalogCategory.create({
      name: 'Analgesics',
      type: 'MEDICINE',
      description: 'Analgesics category'
    });

    const labCategory = await CatalogCategory.create({
      name: 'Pathology',
      type: 'LAB',
      description: 'Pathology category'
    });

    // Seed Global Medicine
    const med = await GlobalMedicine.create({
      globalId: 'MED-000001',
      displayName: 'Global Paracetamol 500mg',
      brandName: 'Calpol',
      genericName: 'Paracetamol',
      medicineType: 'Generic',
      dosageForm: 'Tablet',
      category: medicineCategory._id,
      isActive: true,
      createdBy: adminUserId
    });
    globalMedicineId = med._id;

    // Seed Global Lab Test
    const test = await GlobalLabTest.create({
      globalId: 'LAB-000001',
      name: 'Complete Blood Count',
      shortName: 'CBC',
      department: 'Pathology',
      category: labCategory._id,
      sampleType: 'Blood',
      methodology: 'Automated Cell Counter',
      normalReportingTime: '12 hours',
      isActive: true,
      createdBy: adminUserId
    });
    globalLabTestId = test._id;

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
    await ProviderMapping.deleteMany({});
    await GlobalMedicine.deleteMany({});
    await GlobalLabTest.deleteMany({});
    await Clinic.deleteMany({});
    await User.deleteMany({});
  });

  describe('Authorization Checks', () => {
    it('denies access to non-Admin roles (e.g. Doctor) for registering mappings', async () => {
      const res = await request(app)
        .post('/api/v1/providers/mappings')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          providerId,
          mappingType: 'Medicine',
          globalMedicineId,
          providerCode: 'MED-LOC-01',
          providerName: 'Local Calpol 500'
        });

      expect(res.status).toBe(403);
    });
  });

  describe('Mapping CRUD Operations', () => {
    it('successfully registers a catalog translation mapping link', async () => {
      const res = await request(app)
        .post('/api/v1/providers/mappings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          providerId,
          mappingType: 'Medicine',
          globalMedicineId,
          providerCode: 'MED-LOC-01',
          providerName: 'Local Calpol 500'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.providerCode).toBe('MED-LOC-01');
      expect(res.body.data.providerName).toBe('Local Calpol 500');
    });

    it('prevents registering duplicate mapping link to same global record per provider', async () => {
      // Create first link
      await ProviderMapping.create({
        clinicId,
        providerId,
        mappingType: 'Medicine',
        globalMedicineId,
        providerCode: 'MED-LOC-01',
        providerName: 'Local Calpol 500',
        createdBy: adminUserId,
        updatedBy: adminUserId
      });

      // Try duplicate post
      const res = await request(app)
        .post('/api/v1/providers/mappings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          providerId,
          mappingType: 'Medicine',
          globalMedicineId,
          providerCode: 'MED-LOC-02',
          providerName: 'Calpol Alternative'
        });

      expect(res.status).toBe(409);
    });

    it('successfully retrieves mappings list for a provider', async () => {
      await ProviderMapping.create({
        clinicId,
        providerId,
        mappingType: 'Medicine',
        globalMedicineId,
        providerCode: 'MED-LOC-01',
        providerName: 'Local Calpol 500',
        createdBy: adminUserId,
        updatedBy: adminUserId
      });

      const res = await request(app)
        .get(`/api/v1/providers/${providerId}/mappings`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].providerCode).toBe('MED-LOC-01');
    });

    it('deleting mapping link does not affect global catalog record', async () => {
      const mapping = await ProviderMapping.create({
        clinicId,
        providerId,
        mappingType: 'Medicine',
        globalMedicineId,
        providerCode: 'MED-LOC-01',
        providerName: 'Local Calpol 500',
        createdBy: adminUserId,
        updatedBy: adminUserId
      });

      const res = await request(app)
        .delete(`/api/v1/providers/mappings/${mapping._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      // Verify mapping deleted
      const foundMapping = await ProviderMapping.findById(mapping._id);
      expect(foundMapping).toBeNull();

      // Verify global medicine remains perfectly safe
      const foundMed = await GlobalMedicine.findById(globalMedicineId);
      expect(foundMed).not.toBeNull();
      expect(foundMed.brandName).toBe('Calpol');
    });
  });
});
