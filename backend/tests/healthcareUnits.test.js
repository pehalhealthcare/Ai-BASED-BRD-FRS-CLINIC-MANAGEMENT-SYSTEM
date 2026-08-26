const request = require('supertest');
let app;
let GlobalLaboratoryUnit;
let ReferenceRangeCondition;
let GlobalParameter;
let User;

beforeAll(() => {
  app = require('../src/app');
  GlobalLaboratoryUnit = require('../src/modules/healthcare-catalog/globalLaboratoryUnit.model');
  ReferenceRangeCondition = require('../src/modules/healthcare-catalog/referenceRangeCondition.model');
  GlobalParameter = require('../src/modules/healthcare-catalog/globalParameter.model');
  User = require('../src/modules/users/user.model');
});

describe('Healthcare Laboratory Units and Relational Ranges API Suite', () => {
  let superAdminToken;
  let testUnit;
  let testCondition;

  beforeEach(async () => {
    await User.deleteMany({});
    await GlobalLaboratoryUnit.deleteMany({});
    await ReferenceRangeCondition.deleteMany({});
    await GlobalParameter.deleteMany({});

    // Setup Super Admin User
    await User.create({
      name: 'Super Admin',
      email: 'unitadmin@aicms.com',
      password: 'Password123',
      role: 'SUPER_ADMIN',
      isActive: true
    });

    const saLoginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'unitadmin@aicms.com',
      password: 'Password123'
    });
    superAdminToken = saLoginRes.body.data.accessToken;

    // Seed a unit and a condition inside beforeEach to make sure they exist for the tests
    const unitRes = await request(app)
      .post('/api/v1/healthcare-catalog/global-lab/units')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'grams per deciliter',
        symbol: 'g/dL',
        category: 'Hematology',
        description: 'Standard unit for hemoglobin'
      });
    testUnit = unitRes.body.data;

    const condRes = await request(app)
      .post('/api/v1/healthcare-catalog/global-lab/conditions')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Pregnancy',
        description: 'Gestational reference state'
      });
    testCondition = condRes.body.data;
  });

  test('creates a reusable unit master record', async () => {
    const res = await request(app)
      .post('/api/v1/healthcare-catalog/global-lab/units')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'test units per milliliter',
        symbol: 'T-units/mL',
        category: 'Test',
        description: 'Test unit'
      });

    expect(res.body.success).toBe(true);
    expect(res.body.data.symbol).toBe('T-units/mL');
  });

  test('creates a reusable condition master record', async () => {
    const res = await request(app)
      .post('/api/v1/healthcare-catalog/global-lab/conditions')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Fasting',
        description: 'Fasting reference state'
      });

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Fasting');
  });

  test('creates a numeric global parameter referencing defaultUnitId and structured range details', async () => {
    const res = await request(app)
      .post('/api/v1/healthcare-catalog/parameters')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Hemoglobin Test',
        shortName: 'Hb',
        resultType: 'NUMERIC',
        defaultUnitId: testUnit._id,
        decimalPrecision: 1,
        referenceRanges: [
          {
            gender: 'FEMALE',
            ageFrom: 18,
            ageTo: 45,
            ageUnit: 'YEARS',
            conditionId: testCondition._id,
            fromValue: 11,
            toValue: 14,
            unitId: testUnit._id
          }
        ]
      });

    expect(res.body.success).toBe(true);
    expect(res.body.data.defaultUnitId).toBe(testUnit._id.toString());
    expect(res.body.data.referenceRanges[0].gender).toBe('FEMALE');
    expect(res.body.data.referenceRanges[0].conditionId).toBe(testCondition._id.toString());
    expect(res.body.data.referenceRanges[0].unitId).toBe(testUnit._id.toString());
  });

  test('retrieves parameter with populated defaultUnitId and range details', async () => {
    // Create first
    await request(app)
      .post('/api/v1/healthcare-catalog/parameters')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Hemoglobin Test',
        shortName: 'Hb',
        resultType: 'NUMERIC',
        defaultUnitId: testUnit._id,
        decimalPrecision: 1,
        referenceRanges: [
          {
            gender: 'FEMALE',
            ageFrom: 18,
            ageTo: 45,
            ageUnit: 'YEARS',
            conditionId: testCondition._id,
            fromValue: 11,
            toValue: 14,
            unitId: testUnit._id
          }
        ]
      });

    const res = await request(app)
      .get('/api/v1/healthcare-catalog/parameters')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    const param = res.body.data.items.find(p => p.name === 'Hemoglobin Test');
    expect(param).toBeDefined();
    expect(param.defaultUnitId.symbol).toBe('g/dL');
    expect(param.referenceRanges[0].unitId.symbol).toBe('g/dL');
    expect(param.referenceRanges[0].conditionId.name).toBe('Pregnancy');
  });

  test('updates parameter with empty conditionId (None) without CastError', async () => {
    // Create a parameter first
    const createRes = await request(app)
      .post('/api/v1/healthcare-catalog/parameters')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Test Glucose Update',
        shortName: 'Gluc',
        resultType: 'NUMERIC',
        defaultUnitId: testUnit._id,
        referenceRanges: [
          {
            gender: 'MALE',
            ageFrom: 18,
            ageTo: 65,
            ageUnit: 'YEARS',
            conditionId: testCondition._id,
            fromValue: 70,
            toValue: 100,
            unitId: testUnit._id
          }
        ]
      });

    expect(createRes.body.success).toBe(true);
    const paramId = createRes.body.data._id;

    // Now update with empty conditionId (simulating "None" selected in UI)
    const updateRes = await request(app)
      .put(`/api/v1/healthcare-catalog/parameters/${paramId}`)
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Test Glucose Update',
        resultType: 'NUMERIC',
        defaultUnitId: testUnit._id,
        referenceRanges: [
          {
            gender: 'MALE',
            ageFrom: 18,
            ageTo: 65,
            ageUnit: 'YEARS',
            conditionId: '',   // ← this should NOT cause a CastError
            fromValue: 70,
            toValue: 100,
            unitId: testUnit._id
          }
        ]
      });

    expect(updateRes.body.success).toBe(true);
    expect(updateRes.body.data.referenceRanges[0].conditionId).toBeNull();
  });
});
