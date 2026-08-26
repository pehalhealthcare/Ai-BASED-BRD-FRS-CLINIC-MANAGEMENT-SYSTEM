const request = require('supertest');
const { ROLES } = require('../src/common/constants/roles');
const mongoose = require('mongoose');

let app;
let GlobalLabTest;
let GlobalParameter;
let LabTest;
let Provider;
let User;
let Clinic;
let CatalogCategory;

beforeAll(() => {
  app = require('../src/app');
  GlobalLabTest = require('../src/modules/healthcare-catalog/globalLabTest.model');
  GlobalParameter = require('../src/modules/healthcare-catalog/globalParameter.model');
  LabTest = require('../src/modules/labs/labTest.model');
  Provider = require('../src/modules/providers/provider.model');
  User = require('../src/modules/users/user.model');
  Clinic = require('../src/modules/clinics/clinic.model');
  CatalogCategory = require('../src/modules/healthcare-catalog/catalogCategory.model');
});

describe('Laboratory Workspace Scoping & Override APIs Suite', () => {
  let adminToken;
  let clinic1;
  let clinic2;
  let providerLabA;
  let providerLabB;
  let providerLabClinic2;
  let globalTest;
  let param1;
  let param2;

  beforeEach(async () => {
    await User.deleteMany({});
    await Clinic.deleteMany({});
    await GlobalLabTest.deleteMany({});
    await LabTest.deleteMany({});
    await Provider.deleteMany({});
    await GlobalParameter.deleteMany({});

    // Create clinics
    clinic1 = await Clinic.create({ name: 'Clinic One', code: 'C1', isActive: true });
    clinic2 = await Clinic.create({ name: 'Clinic Two', code: 'C2', isActive: true });

    // Seed Admins
    const admin1 = await User.create({
      name: 'Admin One',
      email: 'admin1@example.com',
      password: 'AdminPassword123!',
      role: ROLES.SUPER_ADMIN,
      clinicId: clinic1._id,
      isActive: true
    });
    const admin2 = await User.create({
      name: 'Admin Two',
      email: 'admin2@example.com',
      password: 'AdminPassword123!',
      role: ROLES.SUPER_ADMIN,
      clinicId: clinic2._id,
      isActive: true
    });

    const loginRes1 = await request(app).post('/api/v1/auth/login').send({ email: 'admin1@example.com', password: 'AdminPassword123!' });
    adminToken = loginRes1.body.data.accessToken;

    const loginRes2 = await request(app).post('/api/v1/auth/login').send({ email: 'admin2@example.com', password: 'AdminPassword123!' });
    adminToken2 = loginRes2.body.data.accessToken;

    // Create Laboratory Providers (multiple labs for clinic1)
    providerLabA = await Provider.create({
      globalId: 'LAB-PROV-0001',
      clinicId: clinic1._id,
      name: 'Lab A',
      providerType: 'Laboratory',
      providerSubtype: 'Internal',
      providerCategory: 'Own Provider',
      contactPerson: 'John LabA',
      phone: '9999911111',
      email: 'laba@clinic1.com',
      address: { line1: 'street 1', city: 'City', state: 'State', country: 'Country', pincode: '110011' },
      createdBy: admin1._id
    });

    providerLabB = await Provider.create({
      globalId: 'LAB-PROV-0002',
      clinicId: clinic1._id,
      name: 'Lab B',
      providerType: 'Laboratory',
      providerSubtype: 'Internal',
      providerCategory: 'Own Provider',
      contactPerson: 'John LabB',
      phone: '9999922222',
      email: 'labb@clinic1.com',
      address: { line1: 'street 2', city: 'City', state: 'State', country: 'Country', pincode: '110011' },
      createdBy: admin1._id
    });

    providerLabClinic2 = await Provider.create({
      globalId: 'LAB-PROV-0003',
      clinicId: clinic2._id,
      name: 'Clinic 2 Lab',
      providerType: 'Laboratory',
      providerSubtype: 'Internal',
      providerCategory: 'Own Provider',
      contactPerson: 'John Clinic2',
      phone: '9999933333',
      email: 'lab@clinic2.com',
      address: { line1: 'street 3', city: 'City', state: 'State', country: 'Country', pincode: '110011' },
      createdBy: admin2._id
    });

    await CatalogCategory.deleteMany({});
    const category = await CatalogCategory.create({
      name: 'Pathology',
      type: 'LAB',
      description: 'Pathology test category'
    });

    // Create parameters
    param1 = await GlobalParameter.create({
      parameterId: 'PAR-100001',
      code: 'HB',
      name: 'Hemoglobin',
      dataType: 'NUMERIC',
      unit: 'g/dL',
      isActive: true,
      createdBy: admin1._id
    });
    param2 = await GlobalParameter.create({
      parameterId: 'PAR-100002',
      code: 'PLT',
      name: 'Platelets',
      dataType: 'NUMERIC',
      unit: 'k/uL',
      isActive: true,
      createdBy: admin1._id
    });

    // Create Global Lab Test
    globalTest = await GlobalLabTest.create({
      globalId: 'LAB-GLB-CBC',
      name: 'Complete Blood Count',
      shortName: 'CBC',
      department: 'Pathology',
      category: category._id,
      sampleType: 'Blood',
      normalReportingTime: '24 Hours',
      investigationType: 'ATOMIC_TEST',
      parameters: [param1._id, param2._id],
      isActive: true
    });
  });

  it('allows Lab A to activate a global test independently of Lab B', async () => {
    // 1. Bulk activate CBC for Lab A
    const activateRes = await request(app)
      .post('/api/v1/labs/tests/bulk-activate')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-clinic-id', clinic1._id.toString())
      .send({
        globalTestIds: [globalTest._id],
        laboratoryId: providerLabA._id.toString()
      });

    expect(activateRes.status).toBe(200);
    expect(activateRes.body.success).toBe(true);
    expect(activateRes.body.data.activated).toHaveLength(1);

    // 2. Fetch Lab A catalogue - should have CBC activated
    const listResA = await request(app)
      .get('/api/v1/labs/tests/available-global')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-clinic-id', clinic1._id.toString())
      .query({ laboratoryId: providerLabA._id.toString() });

    expect(listResA.status).toBe(200);
    expect(listResA.body.data.items[0].isActivated).toBe(true);

    // 3. Fetch Lab B catalogue - should NOT have CBC activated
    const listResB = await request(app)
      .get('/api/v1/labs/tests/available-global')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-clinic-id', clinic1._id.toString())
      .query({ laboratoryId: providerLabB._id.toString() });

    expect(listResB.status).toBe(200);
    expect(listResB.body.data.items[0].isActivated).toBe(false);
  });

  it('prevents IDOR access to laboratory configurations from another clinic', async () => {
    // Admin 2 tries to list available global tests for Lab A (which is under Clinic 1)
    const res = await request(app)
      .get('/api/v1/labs/tests/available-global')
      .set('Authorization', `Bearer ${adminToken2}`)
      .set('x-clinic-id', clinic2._id.toString())
      .query({ laboratoryId: providerLabA._id.toString() });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Access Denied');
  });

  it('allows configuring parameter availability overrides on the activated test', async () => {
    // 1. Activate CBC in Lab A
    const activateRes = await request(app)
      .post('/api/v1/labs/tests/bulk-activate')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-clinic-id', clinic1._id.toString())
      .send({
        globalTestIds: [globalTest._id],
        laboratoryId: providerLabA._id.toString()
      });

    const localTestId = activateRes.body.data.activated[0]._id;

    // 2. Set parameter override (Platelets unavailable)
    const updateRes = await request(app)
      .patch(`/api/v1/labs/tests/${localTestId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-clinic-id', clinic1._id.toString())
      .send({
        laboratoryId: providerLabA._id.toString(),
        parameterOverrides: [
          { parameterId: param1._id.toString(), isAvailable: true },
          { parameterId: param2._id.toString(), isAvailable: false } // Platelets unavailable
        ]
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.labTest.parameterOverrides).toHaveLength(2);
    expect(updateRes.body.data.labTest.parameterOverrides[1].isAvailable).toBe(false);
  });
});
