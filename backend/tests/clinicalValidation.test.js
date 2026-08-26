const request = require('supertest');
const { ROLES } = require('../src/common/constants/roles');
const mongoose = require('mongoose');

let app;
let GlobalParameter;
let User;
let resultValidationService;

beforeAll(() => {
  app = require('../src/app');
  GlobalParameter = require('../src/modules/healthcare-catalog/globalParameter.model');
  User = require('../src/modules/users/user.model');
  resultValidationService = require('../src/modules/healthcare-catalog/resultValidation.service');
});

describe('Clinical Rules & Result Validation Suite', () => {
  let superAdminToken;
  let clinicAdminToken;
  let testUnitId;

  beforeEach(async () => {
    await User.deleteMany({});
    await GlobalParameter.deleteMany({});

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

    testUnitId = new mongoose.Types.ObjectId().toString();
  });

  describe('Validation Service Helper logic', () => {
    it('correctly maps age based on age unit conversions', () => {
      const { convertToDays } = resultValidationService;
      expect(convertToDays(10, 'YEARS')).toBe(3650);
      expect(convertToDays(6, 'MONTHS')).toBe(180);
      expect(convertToDays(15, 'DAYS')).toBe(15);
    });

    it('identifies overlapping age ranges', () => {
      const { checkOverlappingRanges } = resultValidationService;
      const ranges = [
        { gender: 'MALE', ageFrom: 0, ageTo: 12, ageUnit: 'YEARS', isActive: true },
        { gender: 'MALE', ageFrom: 13, ageTo: 40, ageUnit: 'YEARS', isActive: true }
      ];
      // No overlap should not throw
      expect(() => checkOverlappingRanges(ranges)).not.toThrow();

      // Overlap present should throw AppError
      const overlappingRanges = [
        { gender: 'MALE', ageFrom: 0, ageTo: 15, ageUnit: 'YEARS', isActive: true },
        { gender: 'MALE', ageFrom: 10, ageTo: 30, ageUnit: 'YEARS', isActive: true }
      ];
      expect(() => checkOverlappingRanges(overlappingRanges)).toThrow();
    });
  });

  describe('Result Classification Endpoint', () => {
    it('validates results against technical and critical limits', async () => {
      const parameter = await GlobalParameter.create({
        parameterId: 'PAR-123456',
        name: 'Serum Potassium',
        resultType: 'NUMERIC',
        defaultUnitId: testUnitId,
        technicalMin: 1.5,
        technicalMax: 10.0,
        criticalLow: 2.5,
        criticalHigh: 6.5,
        referenceRanges: [{
          gender: 'ALL',
          lowerOperator: 'Between',
          lowerValue: 3.5,
          upperValue: 5.0,
          fromValue: 3.5,
          toValue: 5.0,
          unitId: testUnitId
        }]
      });

      // Test Normal result
      let res = await request(app)
        .post(`/api/v1/healthcare-catalog/parameters/${parameter._id}/validate-result`)
        .set('Authorization', `Bearer ${clinicAdminToken}`)
        .send({ value: '4.2' });
      expect(res.status).toBe(200);
      expect(res.body.data.classification).toBe('NORMAL');
      expect(res.body.data.criticalStatus).toBe('NONE');

      // Test Critical high
      res = await request(app)
        .post(`/api/v1/healthcare-catalog/parameters/${parameter._id}/validate-result`)
        .set('Authorization', `Bearer ${clinicAdminToken}`)
        .send({ value: '7.0' });
      expect(res.status).toBe(200);
      expect(res.body.data.criticalStatus).toBe('CRITICAL_HIGH');
      expect(res.body.data.classification).toBe('HIGH');

      // Test Technical limit violation (too high)
      res = await request(app)
        .post(`/api/v1/healthcare-catalog/parameters/${parameter._id}/validate-result`)
        .set('Authorization', `Bearer ${clinicAdminToken}`)
        .send({ value: '12.0' });
      expect(res.status).toBe(200);
      expect(res.body.data.isValid).toBe(false);
    });

    it('classifies qualitative allowed values and identifies abnormality', async () => {
      const parameter = await GlobalParameter.create({
        parameterId: 'PAR-654321',
        name: 'Urinary Glucose',
        resultType: 'QUALITATIVE',
        allowedValues: [
          { value: 'Negative', code: 'NEG', isAbnormal: false, isCritical: false, isActive: true },
          { value: '1+', code: 'PLUS_1', isAbnormal: true, isCritical: false, isActive: true },
          { value: '3+', code: 'PLUS_3', isAbnormal: true, isCritical: true, isActive: true }
        ]
      });

      // Test Negative
      let res = await request(app)
        .post(`/api/v1/healthcare-catalog/parameters/${parameter._id}/validate-result`)
        .set('Authorization', `Bearer ${clinicAdminToken}`)
        .send({ value: 'Negative' });
      expect(res.status).toBe(200);
      expect(res.body.data.classification).toBe('NORMAL');

      // Test 3+ (Critical)
      res = await request(app)
        .post(`/api/v1/healthcare-catalog/parameters/${parameter._id}/validate-result`)
        .set('Authorization', `Bearer ${clinicAdminToken}`)
        .send({ value: '3+' });
      expect(res.status).toBe(200);
      expect(res.body.data.criticalStatus).toBe('CRITICAL');
      expect(res.body.data.classification).toBe('HIGH');
    });
  });
});
