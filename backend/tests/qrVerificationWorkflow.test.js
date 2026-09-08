const request = require('supertest');
const mongoose = require('mongoose');

describe('AICMS Laboratory QR Code Verification & Workflow Test Suite', () => {
  let app, Clinic, User, Patient, Provider, LabOrder, ROLES, generateAccessToken;
  let clinic;
  let laboratoryProvider;
  let labTechUser;
  let labTechToken;
  let testOrder;
  let foreignOrder;

  beforeAll(() => {
    Clinic = require('../src/modules/clinics/clinic.model');
    User = require('../src/modules/users/user.model');
    Patient = require('../src/modules/patients/patient.model');
    Provider = require('../src/modules/providers/provider.model');
    LabOrder = require('../src/modules/labs/labOrder.model').LabOrder;
    ROLES = require('../src/common/constants/roles').ROLES;
    generateAccessToken = require('../src/modules/auth/token.service').generateAccessToken;
    app = require('../src/app');
  });

  beforeEach(async () => {
    // 1. Create Clinic
    clinic = await Clinic.create({
      name: 'Pehal Central Diagnostics',
      code: `PCD_${Date.now()}`,
      email: `pcd_${Date.now()}@clinic.com`,
      phone: '+919876543210',
      address: {
        line1: '12 Health Avenue',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
        country: 'India'
      },
      status: 'active',
      approvalStatus: 'approved',
      trialFeatures: [{ featureCode: 'labs', isActive: true, expiryDate: new Date(Date.now() + 864000000) }]
    });

    // 2. Create Lab Tech User
    labTechUser = await User.create({
      name: 'Phlebotomist Rohit',
      email: `rohit_${Date.now()}@pehalhealth.com`,
      password: 'Password123!',
      role: ROLES.LAB_TECHNICIAN,
      clinicId: clinic._id,
      approvalStatus: 'approved',
      hasAcceptedSlot: true,
      isActive: true,
      status: 'ACTIVE'
    });

    // 3. Create Laboratory Provider
    laboratoryProvider = await Provider.create({
      globalId: `PROV-LAB-${Date.now()}`,
      clinicId: clinic._id,
      name: 'Pehal Central Laboratory',
      providerType: 'Laboratory',
      providerSubtype: 'Internal',
      providerCategory: 'Own Provider',
      contactPerson: 'Dr. Suresh',
      phone: '+919876543211',
      email: `lab_${Date.now()}@clinic.com`,
      address: {
        line1: 'Medical Block B',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
        country: 'India'
      },
      isActive: true,
      status: 'Active',
      createdBy: labTechUser._id
    });

    labTechUser.providerId = laboratoryProvider._id;
    await labTechUser.save();

    labTechToken = generateAccessToken({
      _id: labTechUser._id,
      role: labTechUser.role,
      clinicId: clinic._id,
      providerId: laboratoryProvider._id
    });

    // 4. Create Patient
    const patientUser = await User.create({
      name: 'Vidya Sharma',
      email: `vidya_${Date.now()}@patient.com`,
      password: 'Password123!',
      role: ROLES.PATIENT,
      clinicId: clinic._id,
      approvalStatus: 'approved',
      hasAcceptedSlot: true,
      isActive: true,
      status: 'ACTIVE'
    });

    const patient = await Patient.create({
      userId: patientUser._id,
      clinicId: clinic._id,
      firstName: 'Vidya',
      lastName: 'Sharma',
      fullName: 'Vidya Sharma',
      uhid: `UHID-${Date.now()}`,
      patientId: `PID-${Date.now()}`,
      dateOfBirth: new Date('1994-06-15'),
      gender: 'female',
      phone: '+919876543212',
      email: patientUser.email,
      address: {
        line1: 'Flat 101, Lakeview',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560001',
        country: 'India'
      }
    });

    // 5. Create primary lab order
    testOrder = await LabOrder.create({
      orderNumber: `LAB-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-5106`,
      clinicId: clinic._id,
      laboratoryId: laboratoryProvider._id,
      patientId: patient._id,
      patientName: patient.fullName,
      patientUhid: patient.uhid,
      collectionToken: `TKN-COL-${Date.now()}`,
      collectionOtp: '123456',
      collectionMethod: 'AT_LAB',
      status: 'ordered',
      tests: [
        {
          code: 'CBC',
          name: 'Complete Blood Count',
          price: 450
        }
      ]
    });

    // 6. Create foreign lab order (belonging to another patient/order)
    foreignOrder = await LabOrder.create({
      orderNumber: `LAB-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-8888`,
      clinicId: clinic._id,
      laboratoryId: laboratoryProvider._id,
      patientId: new mongoose.Types.ObjectId(),
      patientName: 'Rahul Verma',
      patientUhid: `UHID-FOREIGN-${Date.now()}`,
      collectionToken: `TKN-COL-FOREIGN-${Date.now()}`,
      collectionOtp: '654321',
      collectionMethod: 'AT_LAB',
      status: 'ordered',
      tests: [
        {
          code: 'LIPID',
          name: 'Lipid Profile',
          price: 600
        }
      ]
    });
  });

  describe('1. QR Verification with Matching Payloads', () => {
    test('Should verify patient with raw AICMS orderNumber string', async () => {
      const res = await request(app)
        .post(`/api/v1/labs/orders/${testOrder._id}/verify-patient`)
        .set('Authorization', `Bearer ${labTechToken}`)
        .send({
          method: 'QR',
          qrCode: testOrder.orderNumber,
          clinicId: clinic._id.toString()
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.verified).toBe(true);
      expect(res.body.data.sessionId).toMatch(/^SC-\d{8}-\d{4}$/);
      expect(res.body.data.verificationMethod).toBe('QR');
    });

    test('Should verify patient with AICMS structured JSON QR payload', async () => {
      const jsonPayload = JSON.stringify({
        type: 'LAB_COLLECTION_QR',
        orderNumber: testOrder.orderNumber,
        orderId: testOrder._id.toString(),
        collectionToken: testOrder.collectionToken,
        clinicId: clinic._id.toString()
      });

      const res = await request(app)
        .post(`/api/v1/labs/orders/${testOrder._id}/verify-patient`)
        .set('Authorization', `Bearer ${labTechToken}`)
        .send({
          method: 'QR',
          qrCode: jsonPayload,
          clinicId: clinic._id.toString()
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.verified).toBe(true);
    });

    test('Should verify patient with collection token or patientId', async () => {
      const res = await request(app)
        .post(`/api/v1/labs/orders/${testOrder._id}/verify-patient`)
        .set('Authorization', `Bearer ${labTechToken}`)
        .send({
          method: 'QR',
          qrCode: testOrder.collectionToken,
          clinicId: clinic._id.toString()
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.verified).toBe(true);
    });
  });

  describe('2. QR Verification with Foreign or Invalid Payloads', () => {
    test('Should reject QR belonging to another laboratory order with descriptive error', async () => {
      const res = await request(app)
        .post(`/api/v1/labs/orders/${testOrder._id}/verify-patient`)
        .set('Authorization', `Bearer ${labTechToken}`)
        .send({
          method: 'QR',
          qrCode: foreignOrder.orderNumber,
          clinicId: clinic._id.toString()
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/another laboratory order/i);
    });

    test('Should reject QR JSON payload belonging to another laboratory order', async () => {
      const foreignJsonPayload = JSON.stringify({
        type: 'LAB_COLLECTION_QR',
        orderNumber: foreignOrder.orderNumber,
        orderId: foreignOrder._id.toString()
      });

      const res = await request(app)
        .post(`/api/v1/labs/orders/${testOrder._id}/verify-patient`)
        .set('Authorization', `Bearer ${labTechToken}`)
        .send({
          method: 'QR',
          qrCode: foreignJsonPayload,
          clinicId: clinic._id.toString()
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/another laboratory order/i);
    });

    test('Should reject completely invalid or unrelated QR payload', async () => {
      const res = await request(app)
        .post(`/api/v1/labs/orders/${testOrder._id}/verify-patient`)
        .set('Authorization', `Bearer ${labTechToken}`)
        .send({
          method: 'QR',
          qrCode: 'https://random-unrelated-website.com/test',
          clinicId: clinic._id.toString()
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not associated with this AICMS laboratory collection/i);
    });
  });

  describe('3. OTP Fallback Verification', () => {
    test('Should verify patient with correct OTP', async () => {
      const res = await request(app)
        .post(`/api/v1/labs/orders/${testOrder._id}/verify-patient`)
        .set('Authorization', `Bearer ${labTechToken}`)
        .send({
          method: 'OTP',
          otp: '123456',
          clinicId: clinic._id.toString()
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.verificationMethod).toBe('OTP');
    });

    test('Should reject invalid OTP', async () => {
      const res = await request(app)
        .post(`/api/v1/labs/orders/${testOrder._id}/verify-patient`)
        .set('Authorization', `Bearer ${labTechToken}`)
        .send({
          method: 'OTP',
          otp: '999999',
          clinicId: clinic._id.toString()
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid otp/i);
    });
  });

  describe('4. Sequential Specimen Collection Workflow Execution', () => {
    test('Should complete full sample collection workflow after verification', async () => {
      // 1. Verify Patient
      const verifyRes = await request(app)
        .post(`/api/v1/labs/orders/${testOrder._id}/verify-patient`)
        .set('Authorization', `Bearer ${labTechToken}`)
        .send({
          method: 'QR',
          qrCode: testOrder.orderNumber,
          clinicId: clinic._id.toString()
        });
      expect(verifyRes.status).toBe(200);
      const sessionId = verifyRes.body.data.sessionId;

      // 2. Finalize Collection
      const collectRes = await request(app)
        .post(`/api/v1/labs/orders/${testOrder._id}/collect-samples`)
        .set('Authorization', `Bearer ${labTechToken}`)
        .send({
          sampleType: 'EDTA Whole Blood',
          quantityCollected: 4.5,
          quantityUnit: 'mL',
          clinicId: clinic._id.toString()
        });
      expect([200, 201]).toContain(collectRes.status);
      expect(collectRes.body.data.order.status).toBe('sample_collected');
      expect(collectRes.body.data.order.collectionSession.sessionId).toBe(sessionId);
    });
  });
});
