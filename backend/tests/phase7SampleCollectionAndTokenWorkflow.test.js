const request = require('supertest');
const mongoose = require('mongoose');

describe('PHASE 7 — Laboratory Sample Collection, Token Management, QR/Barcode & Home Collection', () => {
  let app, Clinic, User, Patient, Provider, Prescription, LabOrder, LabSample, LabToken, HomeCollectionTask, ROLES, generateAccessToken;
  let clinic;
  let laboratoryProvider;
  let labTechUser;
  let labTechToken;
  let patientUser;
  let patientProfile;
  let patientToken;
  let doctorUser;

  beforeAll(() => {
    Clinic = require('../src/modules/clinics/clinic.model');
    User = require('../src/modules/users/user.model');
    Patient = require('../src/modules/patients/patient.model');
    Provider = require('../src/modules/providers/provider.model');
    Prescription = require('../src/modules/prescriptions/prescription.model');
    LabOrder = require('../src/modules/labs/labOrder.model').LabOrder;
    LabSample = require('../src/modules/labs/labSample.model').LabSample;
    LabToken = require('../src/modules/labs/labToken.model').LabToken;
    HomeCollectionTask = require('../src/modules/labs/homeCollectionTask.model').HomeCollectionTask;
    ROLES = require('../src/common/constants/roles').ROLES;
    generateAccessToken = require('../src/modules/auth/token.service').generateAccessToken;
    app = require('../src/app');
  });

  beforeEach(async () => {
    // 1. Create Clinic
    clinic = await Clinic.create({
      name: 'Apex Diagnostic & Multispeciality Clinic',
      code: `APEX_${Date.now()}`,
      email: `apex_${Date.now()}@clinic.com`,
      phone: '+919876500001',
      address: {
        line1: 'Plot 44, Electronic City',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560100',
        country: 'India'
      },
      status: 'active',
      approvalStatus: 'approved',
      trialFeatures: [{ featureCode: 'labs', isActive: true, expiryDate: new Date(Date.now() + 864000000) }]
    });

    // 2. Create Lab Tech User
    labTechUser = await User.create({
      name: 'Suresh Kumar (Phlebotomist & Tech)',
      email: `suresh_${Date.now()}@apexlab.com`,
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
      name: 'Apex Clinical & Pathology Laboratories',
      providerType: 'Laboratory',
      providerSubtype: 'Internal',
      providerCategory: 'Own Provider',
      contactPerson: 'Dr. Suresh Kumar',
      phone: '+919876500002',
      email: `apexlab_${Date.now()}@clinic.com`,
      address: {
        line1: 'Apex Medical Complex, 2nd Floor',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560100',
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

    // 4. Create Doctor
    doctorUser = await User.create({
      name: 'Dr. Ananya Roy',
      email: `ananya_${Date.now()}@apex.com`,
      password: 'Password123!',
      role: ROLES.DOCTOR,
      clinicId: clinic._id,
      approvalStatus: 'approved',
      hasAcceptedSlot: true,
      isActive: true,
      status: 'ACTIVE'
    });

    // 5. Create Patient
    patientUser = await User.create({
      name: 'Pooja Verma',
      email: `pooja_${Date.now()}@example.com`,
      password: 'Password123!',
      role: ROLES.PATIENT,
      clinicId: clinic._id,
      approvalStatus: 'approved',
      hasAcceptedSlot: true,
      isActive: true,
      status: 'ACTIVE'
    });
    patientProfile = await Patient.create({
      userId: patientUser._id,
      patientId: `PAT-${Date.now()}`,
      clinicId: clinic._id,
      firstName: 'Pooja',
      lastName: 'Verma',
      fullName: 'Pooja Verma',
      email: patientUser.email,
      phone: '+919811223344',
      dateOfBirth: new Date('1994-06-15'),
      gender: 'female',
      address: {
        line1: 'Flat 302, Green Glen Heights',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560103',
        country: 'India'
      }
    });
    patientToken = generateAccessToken({
      _id: patientUser._id,
      role: patientUser.role,
      clinicId: clinic._id
    });
  });

  test('1. Specimen Requirement Calculation & Combined Container Logic (CBC + HbA1c in 1 EDTA tube)', async () => {
    // Create an order containing CBC, HbA1c (both EDTA) and LFT (Serum SST) and Fasting Glucose (Sodium Fluoride)
    const order = await LabOrder.create({
      clinicId: clinic._id,
      laboratoryId: laboratoryProvider._id,
      patientId: patientProfile._id,
      orderNumber: 'ORD-LAB-7001',
      collectionMethod: 'AT_LAB',
      priority: 'routine',
      tests: [
        { code: 'CBC', name: 'Complete Blood Count (CBC)', category: 'Hematology', specimenType: 'Blood', price: 350 },
        { code: 'HBA1C', name: 'Hemoglobin A1c (HbA1c)', category: 'Biochemistry', specimenType: 'Blood', price: 500 },
        { code: 'LFT', name: 'Liver Function Test (LFT)', category: 'Biochemistry', specimenType: 'Serum', price: 750 },
        { code: 'FBS', name: 'Fasting Blood Sugar (FBS)', category: 'Biochemistry', specimenType: 'Blood', price: 150 }
      ],
      totalAmount: 1750,
      status: 'ordered',
      orderStatus: 'ORDER_BOOKED'
    });

    const res = await request(app)
      .get(`/api/v1/labs/orders/${order._id}/required-samples?clinicId=${clinic._id}`)
      .set('Authorization', `Bearer ${labTechToken}`)
      .expect(200);

    const body = res.body.data;
    expect(body.orderNumber).toBe('ORD-LAB-7001');
    expect(body.hasFastingRequirement).toBe(true);
    expect(body.preparationInstructions).toMatch(/Fasting Required/i);

    // 4 tests should be combined into 3 distinct container tubes:
    // 1x EDTA Tube (CBC + HbA1c)
    // 1x Serum SST Tube (LFT)
    // 1x Sodium Fluoride Tube (FBS)
    expect(body.requiredSpecimensCount).toBe(3);
    const edtaSpec = body.requiredSpecimens.find(s => s.combineKey === 'BLOOD_EDTA');
    expect(edtaSpec).toBeDefined();
    expect(edtaSpec.tests).toHaveLength(2);
    expect(edtaSpec.tests).toContain('Complete Blood Count (CBC)');
    expect(edtaSpec.tests).toContain('Hemoglobin A1c (HbA1c)');

    const serumSpec = body.requiredSpecimens.find(s => s.combineKey === 'BLOOD_SERUM');
    expect(serumSpec).toBeDefined();
    expect(serumSpec.tests).toContain('Liver Function Test (LFT)');

    const fluorideSpec = body.requiredSpecimens.find(s => s.combineKey === 'BLOOD_FLUORIDE');
    expect(fluorideSpec).toBeDefined();
    expect(fluorideSpec.tests).toContain('Fasting Blood Sugar (FBS)');
  });

  test('2. Token Generation, Sequence Numbering, Calling to Desk & Skipping', async () => {
    const order1 = await LabOrder.create({
      clinicId: clinic._id,
      laboratoryId: laboratoryProvider._id,
      patientId: patientProfile._id,
      orderNumber: 'ORD-LAB-7002',
      collectionMethod: 'AT_LAB',
      tests: [{ code: 'LIPID', name: 'Lipid Profile', price: 600 }],
      totalAmount: 600,
      status: 'ordered'
    });

    // Generate Token 1
    const resToken1 = await request(app)
      .post('/api/v1/labs/tokens/generate')
      .set('Authorization', `Bearer ${labTechToken}`)
      .send({
        clinicId: clinic._id.toString(),
        laboratoryId: laboratoryProvider._id.toString(),
        orderId: order1._id.toString(),
        counterPrefix: 'A',
        deskNumber: 'Desk 1'
      })
      .expect(201);

    const token1 = resToken1.body.data.token;
    expect(token1.tokenNumber).toBe('A-001');
    expect(token1.status).toBe('WAITING');

    // Call Token 1 to Desk 2
    const resCall = await request(app)
      .patch(`/api/v1/labs/tokens/${token1._id}/call`)
      .set('Authorization', `Bearer ${labTechToken}`)
      .send({ deskNumber: 'Desk 2' })
      .expect(200);

    expect(resCall.body.data.token.status).toBe('CALLED');
    expect(resCall.body.data.token.deskNumber).toBe('Desk 2');

    // Recall Token 1
    const resRecall = await request(app)
      .patch(`/api/v1/labs/tokens/${token1._id}/recall`)
      .set('Authorization', `Bearer ${labTechToken}`)
      .send({ deskNumber: 'Desk 2' })
      .expect(200);

    expect(resRecall.body.data.token.recalledCount).toBe(1);

    // Skip Token 1
    const resSkip = await request(app)
      .patch(`/api/v1/labs/tokens/${token1._id}/skip`)
      .set('Authorization', `Bearer ${labTechToken}`)
      .expect(200);

    expect(resSkip.body.data.token.status).toBe('SKIPPED');
  });

  test('3. Sample Collection Recording, Unique SMP ID, Barcode Generation & Status Progression', async () => {
    const order = await LabOrder.create({
      clinicId: clinic._id,
      laboratoryId: laboratoryProvider._id,
      patientId: patientProfile._id,
      orderNumber: 'ORD-LAB-7003',
      collectionMethod: 'AT_LAB',
      tests: [
        { code: 'CBC', name: 'Complete Blood Count (CBC)', price: 350 },
        { code: 'LIPID', name: 'Lipid Profile', price: 650 }
      ],
      totalAmount: 1000,
      status: 'ordered',
      orderStatus: 'ORDER_BOOKED'
    });

    const resCollection = await request(app)
      .post(`/api/v1/labs/orders/${order._id}/collect-samples`)
      .set('Authorization', `Bearer ${labTechToken}`)
      .send({
        deskNumber: 'Desk 1',
        specimens: [
          {
            specimenType: 'Blood',
            containerType: 'EDTA Tube (Lavender)',
            containerColor: '#8B5CF6',
            volumeRequired: '2.5 mL',
            tests: ['Complete Blood Count (CBC)']
          },
          {
            specimenType: 'Blood',
            containerType: 'Serum Separator Tube (Red/Gold)',
            containerColor: '#EF4444',
            volumeRequired: '3.5 mL',
            tests: ['Lipid Profile']
          }
        ],
        notes: 'Smooth collection from right arm'
      })
      .expect(201);

    const samples = resCollection.body.data.samples;
    expect(samples).toHaveLength(2);
    expect(samples[0].sampleId).toMatch(/^SMP-/);
    expect(samples[0].barcode).toBe(samples[0].sampleId);
    expect(samples[0].status).toBe('COLLECTED');
    expect(samples[0].timeline).toHaveLength(1);
    expect(samples[0].timeline[0].action).toBe('SAMPLE_COLLECTED');

    // Verify order status updated to sample_collected
    const updatedOrder = await LabOrder.findById(order._id);
    expect(updatedOrder.status).toBe('sample_collected');
    expect(updatedOrder.orderStatus).toBe('SAMPLE_COLLECTED');
    expect(updatedOrder.sampleStatus).toBe('SAMPLE_COLLECTED');
    expect(updatedOrder.sampleCollectedAt).toBeDefined();
  });

  test('4. Sample Rejection, Audit Log & Recollection Versioning', async () => {
    const order = await LabOrder.create({
      clinicId: clinic._id,
      laboratoryId: laboratoryProvider._id,
      patientId: patientProfile._id,
      orderNumber: 'ORD-LAB-7004',
      tests: [{ code: 'POTASSIUM', name: 'Potassium Serum', price: 300 }],
      totalAmount: 300,
      status: 'sample_collected'
    });

    const sample = await LabSample.create({
      sampleId: 'SMP-20260901-1001',
      orderId: order._id,
      orderNumber: order.orderNumber,
      patientId: patientProfile._id,
      patientName: patientProfile.fullName,
      clinicId: clinic._id,
      laboratoryId: laboratoryProvider._id,
      specimenType: 'Blood',
      containerType: 'Serum Separator Tube (Red/Gold)',
      status: 'COLLECTED',
      testNames: ['Potassium Serum'],
      volumeRequired: '3.0 mL',
      barcode: 'SMP-20260901-1001'
    });

    // 1. Reject Sample
    const resReject = await request(app)
      .post(`/api/v1/labs/samples/${sample._id}/reject`)
      .set('Authorization', `Bearer ${labTechToken}`)
      .send({
        reason: 'Hemolysed',
        notes: 'Severe hemolysis, potassium reading invalid'
      })
      .expect(200);

    const rejected = resReject.body.data.sample;
    expect(rejected.status).toBe('REJECTED');
    expect(rejected.rejectionReason).toBe('Hemolysed');

    // Check order flagged for recollection
    const orderAfterReject = await LabOrder.findById(order._id);
    expect(['RECOLLECTION_REQUIRED', 'SAMPLE_RECOLLECTION_REQUIRED']).toContain(orderAfterReject.orderStatus);

    // 2. Recollect Sample
    const resRecollect = await request(app)
      .post(`/api/v1/labs/samples/${sample._id}/recollect`)
      .set('Authorization', `Bearer ${labTechToken}`)
      .send({ deskNumber: 'Desk 1', notes: 'Recollected sample fresh draw' })
      .expect(201);

    const recollectedSample = resRecollect.body.data.sample;
    expect(recollectedSample.sampleId).toMatch(/^SMP-/);
    expect(recollectedSample.sampleId).not.toBe(sample.sampleId);
    expect(recollectedSample.recollectionOfSampleId.toString()).toBe(sample._id.toString());
    expect(recollectedSample.status).toBe('COLLECTED');

    // Original rejected sample still preserved in DB
    const origFromDb = await LabSample.findById(sample._id);
    expect(origFromDb.status).toBe('REJECTED');
  });

  test('5. Home Collection Scheduling, Collector Assignment, Status Workflow & Lab Intake Inspection', async () => {
    const order = await LabOrder.create({
      clinicId: clinic._id,
      laboratoryId: laboratoryProvider._id,
      patientId: patientProfile._id,
      orderNumber: 'ORD-LAB-7005',
      collectionMethod: 'HOME_COLLECTION',
      collectionAddress: patientProfile.address,
      collectionSlot: '10:00 AM - 11:00 AM',
      tests: [{ code: 'THYROID', name: 'Thyroid Profile (T3, T4, TSH)', price: 800 }],
      totalAmount: 800,
      status: 'scheduled'
    });

    const task = await HomeCollectionTask.create({
      taskId: 'HCT-20260901-0001',
      orderId: order._id,
      orderNumber: order.orderNumber,
      patientId: patientProfile._id,
      patientName: patientProfile.fullName,
      patientPhone: patientProfile.phone,
      laboratoryId: laboratoryProvider._id,
      clinicId: clinic._id,
      scheduledDate: new Date(),
      slot: '10:00 AM - 11:00 AM',
      collectionAddress: patientProfile.address,
      status: 'REQUESTED'
    });

    // 1. Assign Collector
    const resAssign = await request(app)
      .patch(`/api/v1/labs/home-collections/${task._id}/assign`)
      .set('Authorization', `Bearer ${labTechToken}`)
      .send({
        collectorId: labTechUser._id.toString(),
        collectorName: 'Rajesh Sharma',
        collectorPhone: '+919876543210'
      })
      .expect(200);

    expect(resAssign.body.data.task.status).toBe('ASSIGNED');
    expect(resAssign.body.data.task.collectorName).toBe('Rajesh Sharma');

    // 2. Dispatch Collector
    await request(app)
      .patch(`/api/v1/labs/home-collections/${task._id}/status`)
      .set('Authorization', `Bearer ${labTechToken}`)
      .send({ status: 'COLLECTOR_DISPATCHED' })
      .expect(200);

    // 3. Mark Arrived
    await request(app)
      .patch(`/api/v1/labs/home-collections/${task._id}/status`)
      .set('Authorization', `Bearer ${labTechToken}`)
      .send({ status: 'ARRIVED' })
      .expect(200);

    // 4. Mark Collected
    await request(app)
      .patch(`/api/v1/labs/home-collections/${task._id}/status`)
      .set('Authorization', `Bearer ${labTechToken}`)
      .send({ status: 'COLLECTED' })
      .expect(200);

    // 5. Receive Specimen at Laboratory
    const resReceive = await request(app)
      .post(`/api/v1/labs/home-collections/${task._id}/receive`)
      .set('Authorization', `Bearer ${labTechToken}`)
      .send({
        sampleCondition: 'GOOD',
        notes: 'Specimen received in cold transport box within 40 mins'
      })
      .expect(200);

    expect(resReceive.body.data.task.status).toBe('RECEIVED_AT_LAB');
    expect(resReceive.body.data.task.sampleCondition).toBe('GOOD');

    // Verify order updated to in_processing
    const updatedOrder = await LabOrder.findById(order._id);
    expect(updatedOrder.status).toBe('in_processing');
  });

  test('6. Public Token Display Feed (Zero Patient PII Exposed)', async () => {
    // Generate active called token
    await LabToken.create({
      tokenId: 'TKN-20260901-0099',
      laboratoryId: laboratoryProvider._id,
      clinicId: clinic._id,
      date: new Date().toISOString().split('T')[0],
      tokenNumber: 'A-023',
      sequenceNumber: 23,
      deskNumber: 'Desk 1',
      priority: 'routine',
      patientName: 'CONFIDENTIAL PATIENT NAME',
      patientPhone: '+919999999999',
      status: 'CALLED',
      calledAt: new Date()
    });

    const res = await request(app)
      .get(`/api/v1/labs/tokens/public-display?clinicId=${clinic._id}&laboratoryId=${laboratoryProvider._id}`)
      .set('Authorization', `Bearer ${labTechToken}`)
      .expect(200);

    const body = res.body.data;
    expect(body.currentServing).toHaveLength(1);
    expect(body.currentServing[0].tokenNumber).toBe('A-023');
    expect(body.currentServing[0].deskNumber).toBe('Desk 1');

    // Check PII is completely excluded
    expect(body.currentServing[0].patientName).toBeUndefined();
    expect(body.currentServing[0].patientPhone).toBeUndefined();
  });

  test('7. Universal QR & Barcode Scan Resolution for Samples, Orders, and Prescriptions', async () => {
    // 1. Create a sample
    const sample = await LabSample.create({
      sampleId: 'SMP-20260901-9999',
      orderId: new mongoose.Types.ObjectId(),
      clinicId: clinic._id,
      specimenType: 'Blood',
      containerType: 'EDTA Tube',
      barcode: 'SMP-20260901-9999'
    });

    const resSampleScan = await request(app)
      .get(`/api/v1/labs/lookup-scan?code=SMP-20260901-9999&clinicId=${clinic._id}`)
      .set('Authorization', `Bearer ${labTechToken}`)
      .expect(200);

    expect(resSampleScan.body.data.type).toBe('SAMPLE');
    expect(resSampleScan.body.data.sample.sampleId).toBe('SMP-20260901-9999');

    // 2. Create Prescription
    const prescription = await Prescription.create({
      clinicId: clinic._id,
      patientId: patientProfile._id,
      doctorId: doctorUser._id,
      consultationId: new mongoose.Types.ObjectId(),
      prescriptionNumber: 'RX-7788',
      medicines: [],
      labs: [{ testName: 'Serum Iron Studies' }]
    });

    const resRxScan = await request(app)
      .get(`/api/v1/labs/lookup-scan?code=RX-7788&clinicId=${clinic._id}`)
      .set('Authorization', `Bearer ${labTechToken}`)
      .expect(200);

    expect(resRxScan.body.data.type).toBe('PRESCRIPTION');
    expect(resRxScan.body.data.prescription.prescriptionNumber).toBe('RX-7788');
  });
});
