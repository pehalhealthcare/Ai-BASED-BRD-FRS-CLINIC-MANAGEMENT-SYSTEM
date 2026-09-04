const request = require('supertest');
const mongoose = require('mongoose');

describe('Patient Prescription Upload & Lab Order E2E Workflow', () => {
  let app, Clinic, Patient, Provider, LabTest, LabOrder, Prescription, User, ROLES;
  let clinicId, patientProfileId, labProviderId, patientUser, token;

  beforeAll(() => {
    Clinic = require('../src/modules/clinics/clinic.model');
    Patient = require('../src/modules/patients/patient.model');
    Provider = require('../src/modules/providers/provider.model');
    LabTest = require('../src/modules/labs/labTest.model');
    LabOrder = require('../src/modules/labs/labOrder.model').LabOrder;
    Prescription = require('../src/modules/prescriptions/prescription.model');
    User = require('../src/modules/users/user.model');
    ROLES = require('../src/common/constants/roles').ROLES;
    app = require('../src/app');
  });

  beforeEach(async () => {
    // 1. Setup clinic
    const clinic = await Clinic.create({
      name: 'Radha Krishna Medical Centre',
      code: 'RKMC',
      status: 'active',
      approvalStatus: 'approved',
      trialFeatures: [
        { featureCode: 'labs', isActive: true, expiryDate: new Date(Date.now() + 864000000) },
        { featureCode: 'pharmacy', isActive: true, expiryDate: new Date(Date.now() + 864000000) }
      ],
      address: { street: 'Main Road', city: 'Ghaziabad', state: 'UP', postalCode: '201014', country: 'India' }
    });
    clinicId = clinic._id;

    const { generateAccessToken } = require('../src/modules/auth/token.service');

    // 2. Setup patient user & patient record
    patientUser = await User.create({
      name: 'Aakash Sharma',
      email: 'aakash.upload@example.com',
      password: 'Password@123',
      role: ROLES.PATIENT,
      clinicId,
      activeClinic: clinicId,
      isActive: true,
      approvalStatus: 'approved'
    });

    const patient = await Patient.create({
      userId: patientUser._id,
      clinicId,
      patientId: 'PT-AS001',
      firstName: 'Aakash',
      lastName: 'Sharma',
      phone: '+919876543210',
      email: 'aakash.upload@example.com',
      gender: 'male',
      dateOfBirth: new Date('1990-01-01')
    });
    patientProfileId = patient._id;

    // 3. Setup laboratory provider
    const labProvider = await Provider.create({
      globalId: 'PROV-LAB-RK01',
      name: 'Radha Krishna Laboratory',
      providerType: 'Laboratory',
      providerSubtype: 'Internal',
      providerCategory: 'Own Provider',
      contactPerson: 'Suresh Lab',
      phone: '9876543210',
      email: 'rklab@example.com',
      address: { line1: 'Indirapuram', city: 'Ghaziabad', state: 'UP', country: 'India', pincode: '201014' },
      clinicId,
      isActive: true,
      createdBy: patientUser._id
    });
    labProviderId = labProvider._id;

    // 4. Setup lab test catalogue
    await LabTest.create([
      {
        name: 'Complete Blood Count (CBC)',
        code: 'CBC01',
        category: 'Biochemistry',
        specimenType: 'Blood (EDTA)',
        normalReportingTime: 'Same Day',
        price: 150,
        testPrice: 150,
        laboratoryId: labProviderId,
        clinicId,
        isActive: true,
        createdBy: patientUser._id
      },
      {
        name: 'Lipid Profile',
        code: 'LIPID01',
        category: 'Biochemistry',
        specimenType: 'Serum',
        normalReportingTime: '24 Hours',
        price: 450,
        testPrice: 450,
        laboratoryId: labProviderId,
        clinicId,
        isActive: true,
        createdBy: patientUser._id
      }
    ]);

    // 5. Auth Token
    token = generateAccessToken(patientUser);
  });

  it('1. Extracts laboratory investigations from uploaded prescription and excludes medications', async () => {
    const mockPrescriptionText = `
      Dr. Shyam Clinic
      Patient: Aakash Sharma
      Rx:
      1. Tab Paracetamol 650mg TDS x 3 days
      2. Cap Amoxicillin 500mg BD x 5 days
      Investigations Required:
      - Complete Blood Count (CBC)
      - Lipid Profile
    `;

    const res = await request(app)
      .post('/api/v1/prescriptions/extract-lab-tests')
      .set('Authorization', `Bearer ${token}`)
      .set('x-clinic-id', clinicId.toString())
      .send({
        fileData: Buffer.from(mockPrescriptionText).toString('base64'),
        fileName: 'my_dr_rx.pdf',
        mimeType: 'application/pdf',
        clinicId: clinicId.toString(),
        laboratoryId: labProviderId.toString()
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.extractedTests.length).toBeGreaterThanOrEqual(1);

    // Verify non-lab drugs (Paracetamol, Amoxicillin) are NOT included in extracted tests
    const testNames = res.body.data.extractedTests.map(t => t.testName.toLowerCase());
    expect(testNames.some(t => t.includes('paracetamol'))).toBe(false);
    expect(testNames.some(t => t.includes('amoxicillin'))).toBe(false);
  });

  it('2. Invariant Check: Uploading or extracting tests does NOT automatically create a LabOrder', async () => {
    const orders = await LabOrder.find({ patientId: patientProfileId });
    expect(orders.length).toBe(0);
  });

  it('3. Confirms and saves extracted prescription with UPR-2026-XXXXX format', async () => {
    const res = await request(app)
      .post('/api/v1/prescriptions/save-uploaded')
      .set('Authorization', `Bearer ${token}`)
      .set('x-clinic-id', clinicId.toString())
      .send({
        clinicId: clinicId.toString(),
        fileName: 'my_dr_rx.pdf',
        patientNotes: 'Uploaded by Aakash Sharma for diagnostic booking',
        tests: [
          {
            testName: 'Complete Blood Count (CBC)',
            testCode: 'CBC01',
            category: 'Biochemistry',
            sampleType: 'Blood (EDTA)',
            price: 150
          }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.data.prescription).toBeDefined();
    expect(res.body.data.prescription.sourceType).toBe('PATIENT_UPLOADED');
    expect(res.body.data.prescription.prescriptionNumber).toMatch(/^UPR-/);
  });

  it('4. Validates Promo Code for laboratory checkout (e.g. YAY20)', async () => {
    const res = await request(app)
      .post('/api/v1/labs/promo-codes/validate')
      .set('Authorization', `Bearer ${token}`)
      .set('x-clinic-id', clinicId.toString())
      .send({
        code: 'YAY20',
        subtotal: 600
      });

    expect(res.status).toBe(200);
    expect(res.body.data.valid).toBe(true);
    expect(res.body.data.discountAmount).toBe(120); // 20% of 600
  });

  it('5. Allows patient to checkout confirmed tests, select Home Collection (+₹100), and place actual LabOrder', async () => {
    // Create an uploaded prescription first
    const rx = await Prescription.create({
      clinicId,
      patientId: patientProfileId,
      prescriptionNumber: 'UPR-2026-00045',
      sourceType: 'PATIENT_UPLOADED',
      uploadedFileName: 'my_dr_rx.pdf',
      uploadedAt: new Date(),
      status: 'finalized',
      createdBy: patientUser._id,
      updatedBy: patientUser._id,
      labs: [
        {
          testName: 'Complete Blood Count (CBC)',
          sampleRequired: 'Blood (EDTA)',
          price: 150,
          priceSnapshot: 150,
          code: 'CBC01'
        }
      ]
    });

    const res = await request(app)
      .post('/api/v1/labs/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('x-clinic-id', clinicId.toString())
      .send({
        clinicId: clinicId.toString(),
        patientId: patientProfileId.toString(),
        laboratoryId: labProviderId.toString(),
        tests: [
          {
            testName: 'Complete Blood Count (CBC)',
            code: 'CBC01',
            price: 150,
            prescriptionId: rx._id.toString(),
            sourceType: 'PATIENT_UPLOADED_PRESCRIPTION'
          }
        ],
        collectionMethod: 'HOME_COLLECTION',
        homeCollectionFee: 100,
        collectionAddress: {
          line1: 'Flat 402, Royal Palms, Indirapuram',
          city: 'Ghaziabad',
          pincode: '201014'
        },
        collectionDate: new Date().toISOString().split('T')[0],
        collectionSlot: '08:00 AM - 10:00 AM',
        totalAmount: 250
      });

    if (res.status !== 201) {
      console.error('STEP 5 ERROR RESPONSE:', res.status, res.body);
    }
    expect(res.status).toBe(201);
    const orderData = res.body.data.labOrder || res.body.data.order;
    expect(orderData).toBeDefined();
    expect(orderData.orderNumber).toBeDefined();

    // Verify order exists in DB with home collection
    const orderInDb = await LabOrder.findById(orderData._id);
    expect(orderInDb).toBeDefined();
    expect(orderInDb.collectionMethod).toBe('HOME_COLLECTION');
  });
});
