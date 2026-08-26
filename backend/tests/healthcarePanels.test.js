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

describe('Healthcare Panels and Profiles API Suite', () => {
  let superAdminToken;
  let testCategory;
  let panelTest;
  let param1;
  let param2;

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

    // Seed test category
    testCategory = await CatalogCategory.create({
      name: 'Hematology',
      type: 'LAB',
      description: 'Hematology lab tests'
    });

    // Seed parameters
    param1 = await GlobalParameter.create({
      parameterId: 'PAR-000001',
      name: 'Hemoglobin',
      shortName: 'Hb',
      resultType: 'NUMERIC',
      isActive: true
    });

    param2 = await GlobalParameter.create({
      parameterId: 'PAR-000002',
      name: 'RBC Count',
      shortName: 'RBC',
      resultType: 'NUMERIC',
      isActive: true
    });

    // Seed a Panel Test (using ATOMIC_TEST to map parameters correctly)
    panelTest = await GlobalLabTest.create({
      globalId: 'LAB-000201',
      name: 'Complete Blood Count',
      shortName: 'CBC',
      department: 'Hematology',
      category: testCategory._id,
      sampleType: 'Blood',
      normalReportingTime: 'Same Day',
      investigationType: 'ATOMIC_TEST'
    });
  });

  it('maps multiple parameters to a panel in specific order', async () => {
    // Map parameter 1
    const res1 = await request(app)
      .post(`/api/v1/healthcare-catalog/labs/${panelTest._id}/parameters`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        parameterId: param1._id,
        isRequired: true,
        displayOrder: 1
      });
    expect(res1.status).toBe(200);

    // Map parameter 2
    const res2 = await request(app)
      .post(`/api/v1/healthcare-catalog/labs/${panelTest._id}/parameters`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        parameterId: param2._id,
        isRequired: true,
        displayOrder: 2
      });
    expect(res2.status).toBe(200);

    // Verify composition
    const compRes = await request(app)
      .get(`/api/v1/healthcare-catalog/labs/${panelTest._id}/composition`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    
    expect(compRes.status).toBe(200);
    expect(compRes.body.data.parameters).toHaveLength(2);
    expect(compRes.body.data.parameters[0].name).toBe('Hemoglobin');
    expect(compRes.body.data.parameters[1].name).toBe('RBC Count');
  });

  it('prevents mapping duplicate parameter to same Panel/Profile', async () => {
    // Map param1 first time
    await request(app)
      .post(`/api/v1/healthcare-catalog/labs/${panelTest._id}/parameters`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ parameterId: param1._id });

    // Map param1 second time
    await request(app)
      .post(`/api/v1/healthcare-catalog/labs/${panelTest._id}/parameters`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({ parameterId: param1._id });

    const compRes = await request(app)
      .get(`/api/v1/healthcare-catalog/labs/${panelTest._id}/composition`)
      .set('Authorization', `Bearer ${superAdminToken}`);
    expect(compRes.body.data.parameters).toHaveLength(1);
  });
});
