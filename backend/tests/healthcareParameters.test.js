const request = require('supertest');
const { ROLES } = require('../src/common/constants/roles');
let app;
let CatalogCategory;
let GlobalLabTest;
let GlobalParameter;
let InvestigationParameter;
let User;

beforeAll(() => {
  app = require('../src/app');
  CatalogCategory = require('../src/modules/healthcare-catalog/catalogCategory.model');
  GlobalLabTest = require('../src/modules/healthcare-catalog/globalLabTest.model');
  GlobalParameter = require('../src/modules/healthcare-catalog/globalParameter.model');
  InvestigationParameter = require('../src/modules/healthcare-catalog/investigationParameter.model');
  User = require('../src/modules/users/user.model');
});

describe('Healthcare Parameter and Mapping API Suite', () => {
  let superAdminToken;
  let clinicAdminToken;
  let testCategory;
  let labTest;

  beforeEach(async () => {
    await User.deleteMany({});
    await CatalogCategory.deleteMany({});
    await GlobalLabTest.deleteMany({});
    await GlobalParameter.deleteMany({});
    await InvestigationParameter.deleteMany({});

    // Seed Super Admin
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'superadmin@example.com',
      password: 'SuperPassword123!',
      role: ROLES.SUPER_ADMIN,
      isActive: true
    });
    const saLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'superadmin@example.com',
      password: 'SuperPassword123!'
    });
    superAdminToken = saLoginRes.body.data.accessToken;

    // Seed Clinic Admin
    const clinicAdmin = await User.create({
      name: 'Clinic Admin',
      email: 'admin@example.com',
      password: 'AdminPassword123!',
      role: ROLES.ADMIN,
      isActive: true
    });
    const caLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'admin@example.com',
      password: 'AdminPassword123!'
    });
    clinicAdminToken = caLoginRes.body.data.accessToken;

    // Seed test category
    testCategory = await CatalogCategory.create({
      name: 'Biochemistry',
      type: 'LAB',
      description: 'Lab category'
    });

    // Seed a lab test
    labTest = await GlobalLabTest.create({
      globalId: 'LAB-000001',
      name: 'Complete Blood Count',
      department: 'Hematology',
      category: testCategory._id,
      sampleType: 'Blood',
      normalReportingTime: '12 Hours'
    });
  });

  describe('Parameters management', () => {
    it('creates a new parameter with sequence PAR-xxxxxx', async () => {
      const payload = {
        name: 'Hemoglobin',
        shortName: 'Hb',
        alternateNames: ['Hb', 'Haemoglobin'],
        code: 'HB',
        loincCode: '718-7',
        resultType: 'NUMERIC',
        unit: 'g/dL',
        decimalPrecision: 1,
        referenceRanges: [{
          gender: 'ALL',
          fromValue: 12,
          toValue: 16,
          unit: 'g/dL'
        }]
      };

      const res = await request(app)
        .post('/api/v1/healthcare-catalog/parameters')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.parameterId).toBeDefined();
      expect(res.body.data.parameterId).toMatch(/^PAR-\d{6}$/);
      expect(res.body.data.name).toBe('Hemoglobin');
    });

    it('prevents duplicate parameter names', async () => {
      await GlobalParameter.create({
        parameterId: 'PAR-000001',
        name: 'Hemoglobin',
        resultType: 'NUMERIC'
      });

      const payload = {
        name: 'Hemoglobin',
        resultType: 'NUMERIC'
      };

      const res = await request(app)
        .post('/api/v1/healthcare-catalog/parameters')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(payload);

      expect(res.status).toBe(500); // throws error due to duplicate
    });
  });

  describe('Investigation Parameter Mappings', () => {
    let parameter;

    beforeEach(async () => {
      parameter = await GlobalParameter.create({
        parameterId: 'PAR-000001',
        name: 'Hemoglobin',
        resultType: 'NUMERIC',
        isActive: true
      });
    });

    it('maps a parameter to an investigation', async () => {
      const res = await request(app)
        .post(`/api/v1/healthcare-catalog/labs/${labTest._id}/parameters`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          parameterId: parameter._id,
          isRequired: true,
          displayOrder: 1
        });

      expect(res.status).toBe(200);
      expect(res.body.data.parameterId._id.toString()).toBe(parameter._id.toString());
      expect(res.body.data.displayOrder).toBe(1);
    });

    it('unmaps a parameter from an investigation', async () => {
      await InvestigationParameter.create({
        investigationId: labTest._id,
        parameterId: parameter._id,
        displayOrder: 1
      });

      const res = await request(app)
        .delete(`/api/v1/healthcare-catalog/labs/${labTest._id}/parameters/${parameter._id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
    });
  });
});
