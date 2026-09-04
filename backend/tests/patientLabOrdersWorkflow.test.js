const request = require('supertest');
const mongoose = require('mongoose');

describe('Phase 7 — Patient "My Lab Orders" Workflow & Tracking', () => {
  let app, Clinic, User, Patient, Provider, LabOrder, LabReport, ROLES, generateAccessToken;
  let clinic, laboratory, patientUser, patientDoc, patientToken;
  let otherPatientUser, otherPatientDoc, otherPatientToken;
  let staffUser, staffToken;

  beforeAll(() => {
    Clinic = require('../src/modules/clinics/clinic.model');
    User = require('../src/modules/users/user.model');
    Patient = require('../src/modules/patients/patient.model');
    Provider = require('../src/modules/providers/provider.model');
    LabOrder = require('../src/modules/labs/labOrder.model').LabOrder;
    LabReport = require('../src/modules/labs/labReport.model');
    ROLES = require('../src/common/constants/roles').ROLES;
    generateAccessToken = require('../src/modules/auth/token.service').generateAccessToken;
    app = require('../src/app');
  });

  beforeEach(async () => {
    // 1. Create Clinic & Laboratory
    clinic = await Clinic.create({
      name: "Ram's Dental Clinic",
      code: `CL-LAB-${Math.floor(100 + Math.random() * 900)}`,
      email: `clinic_${Date.now()}@aicms.test`,
      phone: '9876543210',
      address: { city: 'Ghaziabad', state: 'Uttar Pradesh' },
      status: 'active',
      approvalStatus: 'approved',
      trialFeatures: [{ featureCode: 'labs', isActive: true, expiryDate: new Date(Date.now() + 864000000) }]
    });

    // 2. Create Primary Patient (vidya)
    patientUser = await User.create({
      name: 'Vidya Sharma',
      email: `vidya_${Date.now()}@aicms.test`,
      phone: '9988776655',
      password: 'Password123!',
      role: ROLES.PATIENT,
      clinicId: clinic._id
    });

    laboratory = await Provider.create({
      globalId: `PROV-LAB-${Date.now()}`,
      name: 'Radha Krishna Laboratory',
      providerType: 'Laboratory',
      providerSubtype: 'Internal',
      providerCategory: 'Own Provider',
      contactPerson: 'Dr. R.K. Sharma',
      clinicId: clinic._id,
      phone: '9876543210',
      email: `radhakrishna-${Date.now()}@example.com`,
      address: { line1: 'Indiranagar', city: 'Ghaziabad', state: 'Uttar Pradesh', country: 'India', pincode: '201001' },
      isActive: true,
      createdBy: patientUser._id
    });

    patientDoc = await Patient.create({
      userId: patientUser._id,
      clinicId: clinic._id,
      patientId: `PAT-${Date.now()}`,
      firstName: 'Vidya',
      lastName: 'Sharma',
      phone: '9988776655',
      email: patientUser.email,
      gender: 'female',
      dateOfBirth: new Date('1994-05-12')
    });

    patientToken = generateAccessToken({
      _id: patientUser._id,
      role: patientUser.role,
      email: patientUser.email,
      clinicId: clinic._id
    });

    // 3. Create Other Patient (for security isolation test)
    otherPatientUser = await User.create({
      name: 'Other Patient',
      email: `other_${Date.now()}@aicms.test`,
      phone: '9988112233',
      password: 'Password123!',
      role: ROLES.PATIENT,
      clinicId: clinic._id
    });

    otherPatientDoc = await Patient.create({
      userId: otherPatientUser._id,
      clinicId: clinic._id,
      patientId: `PAT-OTH-${Date.now()}`,
      firstName: 'Other',
      lastName: 'Patient',
      phone: '9988112233',
      email: otherPatientUser.email,
      gender: 'male',
      dateOfBirth: new Date('1990-01-01')
    });

    otherPatientToken = generateAccessToken({
      _id: otherPatientUser._id,
      role: otherPatientUser.role,
      email: otherPatientUser.email,
      clinicId: clinic._id
    });

    // 4. Create Lab Staff User
    staffUser = await User.create({
      name: 'Lab Operator',
      email: `labstaff_${Date.now()}@aicms.test`,
      phone: '9123456780',
      password: 'Password123!',
      role: ROLES.LAB_TECHNICIAN,
      clinicId: clinic._id
    });

    staffToken = generateAccessToken({
      _id: staffUser._id,
      role: staffUser.role,
      email: staffUser.email,
      clinicId: clinic._id
    });
  });

  it('1. Should book a Home Collection order and verify initial SCHEDULED state & 6-step progress mapping', async () => {
    const homeOrderRes = await request(app)
      .post('/api/v1/labs/orders')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        clinicId: clinic._id,
        laboratoryId: laboratory._id,
        collectionMethod: 'HOME_COLLECTION',
        collectionDate: new Date().toISOString(),
        collectionSlot: '04:00 PM - 05:00 PM',
        collectionAddress: {
          line1: 'H-23, Indiranagar, Near Shanti Park',
          city: 'Ghaziabad',
          state: 'Uttar Pradesh',
          pincode: '201001'
        },
        homeCollectionFee: 100,
        tests: [
          { code: 'CBC', name: 'Complete Blood Count (CBC)', price: 350 },
          { code: 'LIPID', name: 'Lipid Profile', price: 650 }
        ],
        packageName: 'Complete Blood Count (CBC) + Lipid Profile',
        price: 1000,
        totalAmount: 1100
      });

    expect(homeOrderRes.status).toBe(201);
    const order = homeOrderRes.body.data.labOrder;
    expect(order.collectionMethod).toBe('HOME_COLLECTION');
    expect(order.status).toBe('scheduled');
    expect(order.orderStatus).toBe('COLLECTION_SCHEDULED');
    expect(order.homeCollectionFee).toBe(100);
    expect(order.orderNumber).toMatch(/^(ORD-LAB|LAB-)/);
  });

  it('2. Should create At-Laboratory orders and auto-generate daily queue tokens (T-01, T-02)', async () => {
    const atLabOrderRes1 = await request(app)
      .post('/api/v1/labs/orders')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        clinicId: clinic._id,
        laboratoryId: laboratory._id,
        collectionMethod: 'AT_LAB',
        collectionDate: new Date().toISOString(),
        tests: [
          { code: 'THYROID', name: 'Thyroid Profile (T3, T4, TSH)', price: 550 }
        ],
        packageName: 'Thyroid Profile (T3, T4, TSH)',
        price: 550,
        totalAmount: 550
      });

    expect(atLabOrderRes1.status).toBe(201);
    const order1 = atLabOrderRes1.body.data.labOrder;
    expect(order1.collectionMethod).toBe('AT_LAB');
    expect(order1.tokenNumber).toBe('T-01');

    const atLabOrderRes2 = await request(app)
      .post('/api/v1/labs/orders')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        clinicId: clinic._id,
        laboratoryId: laboratory._id,
        collectionMethod: 'AT_LAB',
        collectionDate: new Date().toISOString(),
        tests: [
          { code: 'LFT', name: 'Liver Function Test (LFT)', price: 600 }
        ],
        packageName: 'Liver Function Test (LFT)',
        price: 600,
        totalAmount: 600
      });

    expect(atLabOrderRes2.status).toBe(201);
    const order2 = atLabOrderRes2.body.data.labOrder;
    expect(order2.tokenNumber).toBe('T-02');
  });

  it('3. Should auto-link staff-created walk-in orders matching patient phone to patient account with isWalkIn: true', async () => {
    const walkInRes = await request(app)
      .post('/api/v1/labs/orders')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        clinicId: clinic._id,
        laboratoryId: laboratory._id,
        patientType: 'WALK_IN',
        collectionMethod: 'AT_LAB',
        nonRegisteredPatientDetails: {
          fullName: 'Vidya Sharma',
          phone: '9988776655', // matching patient phone
          email: 'vidya@example.com',
          age: 30,
          gender: 'female'
        },
        tests: [
          { code: 'VIT_D', name: 'Vitamin D (25-Hydroxy)', price: 900 }
        ],
        packageName: 'Vitamin D (25-Hydroxy)',
        price: 900,
        totalAmount: 900
      });

    expect(walkInRes.status).toBe(201);

    // Patient queries their orders
    const patientOrdersRes = await request(app)
      .get('/api/v1/labs/orders')
      .set('Authorization', `Bearer ${patientToken}`)
      .query({ clinicId: clinic._id.toString() });

    expect(patientOrdersRes.status).toBe(200);
    const orders = patientOrdersRes.body.data.labOrders;
    const walkInOrder = orders.find(o => o.packageName === 'Vitamin D (25-Hydroxy)');
    expect(walkInOrder).toBeDefined();
    expect(walkInOrder.isWalkIn).toBe(true);
  });

  it('4. Should support filter by collectionMethod (HOME_COLLECTION vs AT_LAB)', async () => {
    // Create one Home Collection order and one At-Lab order
    await request(app)
      .post('/api/v1/labs/orders')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        clinicId: clinic._id,
        laboratoryId: laboratory._id,
        collectionMethod: 'HOME_COLLECTION',
        tests: [{ code: 'CBC', name: 'Complete Blood Count (CBC)', price: 350 }],
        price: 350,
        totalAmount: 350
      });

    await request(app)
      .post('/api/v1/labs/orders')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        clinicId: clinic._id,
        laboratoryId: laboratory._id,
        collectionMethod: 'AT_LAB',
        tests: [{ code: 'LIPID', name: 'Lipid Profile', price: 650 }],
        price: 650,
        totalAmount: 650
      });

    const homeOnlyRes = await request(app)
      .get('/api/v1/labs/orders')
      .set('Authorization', `Bearer ${patientToken}`)
      .query({ clinicId: clinic._id.toString(), collectionMethod: 'HOME_COLLECTION' });

    expect(homeOnlyRes.status).toBe(200);
    const homeOrders = homeOnlyRes.body.data.labOrders;
    expect(homeOrders.length).toBeGreaterThanOrEqual(1);
    expect(homeOrders.every(o => o.collectionMethod === 'HOME_COLLECTION')).toBe(true);

    const atLabOnlyRes = await request(app)
      .get('/api/v1/labs/orders')
      .set('Authorization', `Bearer ${patientToken}`)
      .query({ clinicId: clinic._id.toString(), collectionMethod: 'AT_LAB' });

    expect(atLabOnlyRes.status).toBe(200);
    const labOrders = atLabOnlyRes.body.data.labOrders;
    expect(labOrders.length).toBeGreaterThanOrEqual(1);
    expect(labOrders.every(o => o.collectionMethod === 'AT_LAB')).toBe(true);
  });

  it('5. Should allow cancelling an early-stage order and prevent cancelling once testing is in progress', async () => {
    // Create an order to cancel
    const newOrderRes = await request(app)
      .post('/api/v1/labs/orders')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        clinicId: clinic._id,
        laboratoryId: laboratory._id,
        collectionMethod: 'HOME_COLLECTION',
        tests: [{ code: 'FBS', name: 'Fasting Blood Sugar', price: 150 }],
        price: 150,
        totalAmount: 150
      });

    const orderId = newOrderRes.body.data.labOrder._id;

    // Patient cancels
    const cancelRes = await request(app)
      .patch(`/api/v1/labs/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ reason: 'Changed mind' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.labOrder.status).toBe('cancelled');
    expect(cancelRes.body.data.labOrder.orderStatus).toBe('CANCELLED');

    // Attempting to cancel an in-processing order should be blocked
    const inProcessingOrder = await LabOrder.create({
      clinicId: clinic._id,
      laboratoryId: laboratory._id,
      patientId: patientDoc._id,
      orderNumber: `ORD-TEST-${Date.now()}`,
      collectionMethod: 'AT_LAB',
      tests: [{ code: 'HB', name: 'Hemoglobin', price: 100 }],
      status: 'in_processing',
      orderStatus: 'IN_LAB_TESTING',
      createdBy: patientUser._id
    });

    const failedCancelRes = await request(app)
      .patch(`/api/v1/labs/orders/${inProcessingOrder._id}/cancel`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ reason: 'Trying to cancel' });

    expect(failedCancelRes.status).toBe(400);
    expect(failedCancelRes.body.message).toMatch(/cannot be cancelled/);
  });

  it('6. Should enforce patient data isolation (other patient cannot view Vidya’s orders)', async () => {
    const otherPatientOrdersRes = await request(app)
      .get('/api/v1/labs/orders')
      .set('Authorization', `Bearer ${otherPatientToken}`)
      .query({ clinicId: clinic._id.toString() });

    expect(otherPatientOrdersRes.status).toBe(200);
    const otherOrders = otherPatientOrdersRes.body.data.labOrders;
    // Other patient should see 0 of Vidya's orders
    expect(otherOrders.length).toBe(0);
  });
});
