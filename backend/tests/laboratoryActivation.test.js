const request = require('supertest');
const { ROLES } = require('../src/common/constants/roles');
const mongoose = require('mongoose');

let app;
let GlobalLabTest;
let LabTest;
let User;
let Clinic;

beforeAll(() => {
  app = require('../src/app');
  GlobalLabTest = require('../src/modules/healthcare-catalog/globalLabTest.model');
  LabTest = require('../src/modules/labs/labTest.model');
  User = require('../src/modules/users/user.model');
  Clinic = require('../src/modules/clinics/clinic.model');
});

describe('Laboratory Local Activation & Configurations API Suite', () => {
  let adminToken;
  let clinic;
  let globalTest1;
  let globalTest2;

  beforeEach(async () => {
    await User.deleteMany({});
    await Clinic.deleteMany({});
    await GlobalLabTest.deleteMany({});
    await LabTest.deleteMany({});

    // 1. Create a clinic
    clinic = await Clinic.create({
      name: 'Test Diagnostics Clinic',
      code: 'TESTDIAG',
      isActive: true
    });

    // 2. Seed Admin User
    const adminUser = await User.create({
      name: 'Clinic Admin',
      email: 'clinicadmin@example.com',
      password: 'AdminPassword123!',
      role: ROLES.SUPER_ADMIN,
      clinicId: clinic._id,
      isActive: true
    });

    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'clinicadmin@example.com',
      password: 'AdminPassword123!'
    });
    adminToken = loginRes.body.data.accessToken;

    const CatalogCategory = require('../src/modules/healthcare-catalog/catalogCategory.model');
    await CatalogCategory.deleteMany({});
    const category = await CatalogCategory.create({
      name: 'Pathology',
      type: 'LAB',
      description: 'Pathology test category'
    });

    // 3. Seed Global Laboratory Catalog Tests
    globalTest1 = await GlobalLabTest.create({
      globalId: 'LAB-100001',
      name: 'Complete Blood Count',
      shortName: 'CBC',
      department: 'Pathology',
      category: category._id,
      sampleType: 'Blood',
      normalReportingTime: '24 Hours',
      investigationType: 'ATOMIC_TEST',
      isActive: true
    });

    globalTest2 = await GlobalLabTest.create({
      globalId: 'LAB-100002',
      name: 'Lipid Profile',
      shortName: 'LIPID',
      department: 'Biochemistry',
      category: category._id,
      sampleType: 'Serum',
      normalReportingTime: '12 Hours',
      investigationType: 'PANEL',
      isActive: true
    });
  });

  it('lists active global master tests with activation status flags', async () => {
    const res = await request(app)
      .get('/api/v1/labs/tests/available-global')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-clinic-id', clinic._id.toString());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toHaveLength(2);
    expect(res.body.data.items[0].isActivated).toBe(false);
  });

  it('bulk activates global diagnostic catalogue items successfully', async () => {
    const res = await request(app)
      .post('/api/v1/labs/tests/bulk-activate')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-clinic-id', clinic._id.toString())
      .send({
        globalTestIds: [globalTest1._id, globalTest2._id]
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.activated).toHaveLength(2);

    // Verify local configurations created in DB
    const localCount = await LabTest.countDocuments({ clinicId: clinic._id });
    expect(localCount).toBe(2);
  });

  it('configures local settings for activated test overrides', async () => {
    // First activate
    const activateRes = await request(app)
      .post('/api/v1/labs/tests/bulk-activate')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-clinic-id', clinic._id.toString())
      .send({
        globalTestIds: [globalTest1._id]
      });

    const localTest = activateRes.body.data.activated[0];

    // Configure overrides
    const configRes = await request(app)
      .patch(`/api/v1/labs/tests/${localTest._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-clinic-id', clinic._id.toString())
      .send({
        price: 450,
        turnaroundTime: '12 Hours',
        processingMode: 'OUTSOURCED',
        outsourcedLabName: 'Apex Reference Labs',
        isActive: true
      });

    expect(configRes.status).toBe(200);
    expect(configRes.body.success).toBe(true);
    expect(configRes.body.data.labTest.price).toBe(450);
    expect(configRes.body.data.labTest.processingMode).toBe('OUTSOURCED');
    expect(configRes.body.data.labTest.outsourcedLabName).toBe('Apex Reference Labs');
  });
});
