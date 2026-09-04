const request = require('supertest');
const mongoose = require('mongoose');

describe('Patient Laboratory Checkout Page Flow & Invariants', () => {
  let app, Clinic, User, Patient, Provider, Prescription, LabOrder, LabTest, GlobalLabTest, ROLES, generateAccessToken;
  let clinicId, patientUser, patientProfileId, token, labProviderId;

  beforeAll(() => {
    Clinic = require('../src/modules/clinics/clinic.model');
    User = require('../src/modules/users/user.model');
    Patient = require('../src/modules/patients/patient.model');
    Provider = require('../src/modules/providers/provider.model');
    Prescription = require('../src/modules/prescriptions/prescription.model');
    LabOrder = require('../src/modules/labs/labOrder.model').LabOrder;
    LabTest = require('../src/modules/labs/labTest.model');
    GlobalLabTest = require('../src/modules/healthcare-catalog/globalLabTest.model');
    ROLES = require('../src/common/constants/roles').ROLES;
    generateAccessToken = require('../src/modules/auth/token.service').generateAccessToken;
    app = require('../src/app');
  });

  beforeEach(async () => {
    // 1. Create Clinic with active labs subscription
    const clinic = await Clinic.create({
      name: "Ram's Dental Clinic",
      code: `RDC${Math.floor(100 + Math.random() * 900)}`,
      email: `clinic_${Date.now()}@aicms.test`,
      phone: '9876543210',
      address: {
        line1: 'Indiranagar Branch',
        city: 'Ghaziabad',
        state: 'Uttar Pradesh',
        pincode: '201001'
      },
      status: 'active',
      approvalStatus: 'approved',
      trialFeatures: [
        {
          featureCode: 'labs',
          isActive: true,
          expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      ]
    });
    clinicId = clinic._id;

    // 2. Create Patient User & Patient Profile
    patientUser = await User.create({
      name: 'vidya',
      email: `vidya_${Date.now()}@aicms.test`,
      phone: '9876543210',
      password: 'Password123!',
      role: ROLES.PATIENT,
      clinicId,
      activeClinic: clinicId,
      status: 'active',
      isActive: true,
      approvalStatus: 'approved'
    });

    const patientProfile = await Patient.create({
      clinicId,
      userId: patientUser._id,
      patientId: 'PAT-20260716-0001',
      firstName: 'vidya',
      lastName: 'sharma',
      fullName: 'vidya sharma',
      email: patientUser.email,
      phone: '9876543210',
      gender: 'female',
      dateOfBirth: new Date('1998-01-01'),
      address: {
        line1: 'H-23, Indiranagar, Near Shanti Park',
        city: 'Ghaziabad',
        state: 'Uttar Pradesh',
        pincode: '201001'
      }
    });
    patientProfileId = patientProfile._id;

    token = generateAccessToken(patientUser);

    // 3. Create Laboratory Provider
    const labProvider = await Provider.create({
      globalId: `PROV-LAB-${Date.now()}`,
      name: 'Radha Krishna Laboratory',
      providerType: 'Laboratory',
      providerSubtype: 'Internal',
      providerCategory: 'Own Provider',
      contactPerson: 'Dr. R.K. Sharma',
      phone: '9876500000',
      email: `rk_lab_${Date.now()}@aicms.test`,
      address: {
        line1: 'Plot 14, Indiranagar',
        city: 'Ghaziabad',
        state: 'Uttar Pradesh',
        country: 'India',
        pincode: '201001'
      },
      clinicId,
      isActive: true,
      createdBy: patientUser._id
    });
    labProviderId = labProvider._id;
  });

  it('1. Verifies Local Laboratory Pricing Precedence over Global Catalogue', async () => {
    // Global Catalog price: ₹350, Local Lab price: ₹150
    const globalTest = await GlobalLabTest.create({
      globalId: `GLT-TLC-${Date.now()}`,
      name: `Total Leucocyte Count (TLC) ${Date.now()}`,
      internalCode: 'TLC01',
      price: 350,
      testPrice: 350,
      sampleType: 'Whole Blood',
      department: 'Pathology',
      normalReportingTime: '24 Hours',
      category: new mongoose.Types.ObjectId()
    });

    const localLabTest = await LabTest.create({
      clinicId,
      providerId: labProviderId,
      laboratoryId: labProviderId,
      globalLabTestId: globalTest._id,
      name: 'T.L.C.',
      code: 'TLC01',
      price: 150,
      specimenType: 'Whole Blood',
      turnaroundTime: '24 Hours',
      isActive: true
    });

    expect(localLabTest.price).toBe(150);
    expect(localLabTest.globalLabTestId).toEqual(globalTest._id);
  });

  it('2. Invariant Check: Reviewing checkout or adding tests never creates a LabOrder', async () => {
    const ordersBefore = await LabOrder.countDocuments({ clinicId, patientId: patientProfileId });
    expect(ordersBefore).toBe(0);

    // Call promo code validation & package suggestions
    const promoRes = await request(app)
      .post('/api/v1/labs/promo-codes/validate')
      .set('Authorization', `Bearer ${token}`)
      .set('x-clinic-id', clinicId.toString())
      .send({
        code: 'YAY20',
        cartTotal: 1200
      });

    expect(promoRes.status).toBe(200);
    expect(promoRes.body.data.discountAmount).toBe(240);

    // Verify still zero lab orders in DB
    const ordersAfter = await LabOrder.countDocuments({ clinicId, patientId: patientProfileId });
    expect(ordersAfter).toBe(0);
  });

  it('3. Completes full Checkout with Home Collection (+₹100) and Promo Discount (-₹240)', async () => {
    const rx = await Prescription.create({
      clinicId,
      patientId: patientProfileId,
      prescriptionNumber: 'UPR-2026-00045',
      sourceType: 'PATIENT_UPLOADED',
      uploadedFileName: 'prescr_vidya.pdf',
      uploadedAt: new Date(),
      status: 'finalized',
      createdBy: patientUser._id,
      updatedBy: patientUser._id,
      labs: [
        { testName: 'T.L.C', sampleRequired: 'Whole Blood', price: 150, code: 'TLC01' },
        { testName: 'Alpha Test', sampleRequired: 'Serum', price: 750, code: 'ALPHA01' },
        { testName: 'CRP', sampleRequired: 'Serum', price: 300, code: 'CRP01' }
      ]
    });

    const checkoutPayload = {
      clinicId: clinicId.toString(),
      patientId: patientProfileId.toString(),
      laboratoryId: labProviderId.toString(),
      tests: [
        {
          testName: 'T.L.C',
          name: 'T.L.C',
          code: 'TLC01',
          price: 150,
          specimenType: 'Whole Blood',
          turnaroundTime: '24 Hours',
          prescriptionId: rx._id.toString(),
          sourceType: 'PATIENT_UPLOADED_PRESCRIPTION'
        },
        {
          testName: 'Alpha Test',
          name: 'Alpha Test',
          code: 'ALPHA01',
          price: 750,
          specimenType: 'Serum',
          turnaroundTime: '24 Hours',
          prescriptionId: rx._id.toString(),
          sourceType: 'PATIENT_UPLOADED_PRESCRIPTION'
        },
        {
          testName: 'CRP',
          name: 'CRP',
          code: 'CRP01',
          price: 300,
          specimenType: 'Serum',
          turnaroundTime: 'Same Day',
          prescriptionId: rx._id.toString(),
          sourceType: 'PATIENT_UPLOADED_PRESCRIPTION'
        }
      ],
      collectionMethod: 'HOME_COLLECTION',
      homeCollectionFee: 100,
      collectionAddress: {
        line1: 'H-23, Indiranagar, Near Shanti Park',
        city: 'Ghaziabad',
        state: 'Uttar Pradesh',
        pincode: '201001'
      },
      collectionDate: '2026-09-03',
      collectionSlot: '10:00 AM - 12:00 PM',
      promoCode: 'YAY20',
      discountAmount: 240,
      totalAmount: 1060, // 1200 + 100 - 240 = 1060
      paymentStatus: 'PAID',
      paymentMethod: 'UPI'
    };

    const res = await request(app)
      .post('/api/v1/labs/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('x-clinic-id', clinicId.toString())
      .send(checkoutPayload);

    expect(res.status).toBe(201);
    const order = res.body.data.labOrder || res.body.data.order;
    expect(order).toBeDefined();
    expect(order.orderNumber).toBeDefined();

    // Verify DB record
    const orderDoc = await LabOrder.findById(order._id);
    expect(orderDoc).toBeDefined();
    expect(orderDoc.collectionMethod).toBe('HOME_COLLECTION');
    expect(orderDoc.homeCollectionFee).toBe(100);
    expect(orderDoc.discountAmount).toBe(240);
    expect(orderDoc.promoCode).toBe('YAY20');
    expect(orderDoc.collectionSlot).toBe('10:00 AM - 12:00 PM');
    expect(orderDoc.collectionAddress.line1).toBe('H-23, Indiranagar, Near Shanti Park');
    expect(orderDoc.tests.length).toBe(3);
  });
});
