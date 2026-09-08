const mongoose = require('mongoose');

describe('End-to-End Master Lab Order + Sample Collection Workflow & Recollection Loop', () => {
  let Clinic, Doctor, Patient, User, Provider, LabTest, LabOrder, LabSample, LabReport, LabToken;
  let labService, ROLES;

  let clinic;
  let doctorUser, doctorProfile;
  let patientUser, patientProfile;
  let labTechUser;
  let labProvider;
  let cbcTest;

  beforeAll(() => {
    Clinic = require('../src/modules/clinics/clinic.model');
    Doctor = require('../src/modules/doctors/doctor.model');
    Patient = require('../src/modules/patients/patient.model');
    User = require('../src/modules/users/user.model');
    Provider = require('../src/modules/providers/provider.model');
    LabTest = require('../src/modules/labs/labTest.model');
    LabOrder = require('../src/modules/labs/labOrder.model').LabOrder;
    LabSample = require('../src/modules/labs/labSample.model').LabSample;
    LabReport = require('../src/modules/labs/labReport.model');
    LabToken = require('../src/modules/labs/labToken.model');
    labService = require('../src/modules/labs/lab.service');
    ROLES = require('../src/common/constants/roles').ROLES;
  });

  beforeEach(async () => {
    // 1. Setup Clinic
    clinic = await Clinic.create({
      name: 'Radha Krishna Clinic & Diagnostics',
      code: 'RKC-01',
      address: { street: 'Station Road', city: 'Ghaziabad', state: 'Uttar Pradesh', postalCode: '201001', country: 'India' },
      phone: '+919876501234',
      email: 'lab@radhakrishna.com',
      status: 'active'
    });

    // 2. Setup Doctor
    doctorUser = await User.create({
      name: 'Dr. Sharma',
      email: 'dr.sharma@radhakrishna.com',
      password: 'Password@123',
      role: ROLES.DOCTOR,
      clinicId: clinic._id,
      activeClinic: clinic._id
    });
    doctorProfile = await Doctor.create({
      userId: doctorUser._id,
      clinicId: clinic._id,
      firstName: 'Ramesh',
      lastName: 'Sharma',
      phone: '+919876540001',
      email: 'dr.sharma@radhakrishna.com',
      specialization: 'Pathologist',
      doctorCode: 'DOC-RS01',
      isActive: true,
      approvalStatus: 'approved'
    });

    // 3. Setup Patient
    patientUser = await User.create({
      name: 'Vidya Devi',
      email: 'vidya@example.com',
      password: 'Password@123',
      phone: '+919876543210',
      role: ROLES.PATIENT,
      clinicId: clinic._id,
      activeClinic: clinic._id
    });
    patientProfile = await Patient.create({
      userId: patientUser._id,
      clinicId: clinic._id,
      firstName: 'Vidya',
      lastName: 'Devi',
      phone: '+919876543210',
      email: 'vidya@example.com',
      gender: 'female',
      dob: new Date('1988-05-15'),
      patientId: 'PAT-RK-001',
      status: 'active'
    });

    // 4. Setup Lab Tech User & Lab Provider
    labTechUser = await User.create({
      name: 'Lab Technician Anil',
      email: 'anil.tech@radhakrishna.com',
      password: 'Password@123',
      role: ROLES.LAB_TECHNICIAN,
      clinicId: clinic._id,
      activeClinic: clinic._id
    });

    labProvider = await Provider.create({
      globalId: 'PROV-LAB-RK01',
      name: 'Radha Krishna Central Lab',
      providerType: 'Laboratory',
      providerSubtype: 'Internal',
      providerCategory: 'Own Provider',
      contactPerson: 'Dr. Anil Central',
      phone: '9876540002',
      email: 'central.lab@radhakrishna.com',
      address: {
        line1: 'Station Road',
        city: 'Ghaziabad',
        state: 'Uttar Pradesh',
        country: 'India',
        pincode: '201001'
      },
      clinicId: clinic._id,
      isActive: true,
      createdBy: doctorUser._id
    });

    // 5. Setup Test Catalog
    cbcTest = await LabTest.create({
      clinicId: clinic._id,
      laboratoryId: labProvider._id,
      name: 'Complete Blood Count (CBC)',
      code: 'CBC-001',
      category: 'Hematology',
      specimenType: 'Whole Blood EDTA',
      price: 350,
      turnaroundTime: '4 hours',
      isActive: true,
      localParameters: [
        { name: 'Hemoglobin', shortName: 'HB', unit: 'g/dL', resultType: 'NUMERIC' },
        { name: 'WBC Count', shortName: 'WBC', unit: '10^3/uL', resultType: 'NUMERIC' },
        { name: 'Platelet Count', shortName: 'PLT', unit: '10^3/uL', resultType: 'NUMERIC' }
      ]
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  test('Complete 8-Stage Lifecycle: ORDERED -> SAMPLE_COLLECTED -> PROCESSING -> RESULTS_ENTRY -> READY_FOR_REVIEW -> COMPLETED', async () => {
    // 1. Create Patient Portal Order (ORDERED)
    const createOrderResult = await labService.createLabOrder({
      requester: patientUser,
      payload: {
        patientId: patientProfile._id,
        doctorId: doctorProfile._id,
        laboratoryId: labProvider._id,
        tests: [{
          labTestId: cbcTest._id,
          name: cbcTest.name,
          code: cbcTest.code,
          price: cbcTest.price,
          specimenType: cbcTest.specimenType
        }],
        collectionMethod: 'AT_LAB',
        source: 'PATIENT_BOOKED',
        paymentStatus: 'PAID',
        paidAmount: 350,
        totalAmount: 350
      },
      requestedClinicId: clinic._id
    });

    const orderId = createOrderResult._id;
    expect(createOrderResult.status).toBe('ordered');
    expect(['ORDERED', 'ORDER_BOOKED']).toContain(createOrderResult.orderStatus);
    expect(createOrderResult.source).toBe('PATIENT_BOOKED');
    expect(createOrderResult.tokenNumber).toBeDefined();

    // 2. Initiate Sample Collection Session (Without marking sample as collected)
    const sessionResult1 = await labService.startCollectionSession({
      requester: labTechUser,
      orderId,
      requestedClinicId: clinic._id
    });
    expect(sessionResult1.order).toBeDefined();
    expect(sessionResult1.order.status).toBe('ordered'); // Must still be ORDERED!
    expect(sessionResult1.order.collectionSessionStarted).toBe(true);
    expect(sessionResult1.order.collectionStatus).toBe('IN_PROGRESS');
    expect(sessionResult1.collectionSession).toBeDefined();
    expect(sessionResult1.collectionSession.sessionId).toMatch(/^SC-\d{8}-\d{4}$/);
    expect(sessionResult1.isExisting).toBe(false);

    // Verify Idempotency - second click must return same session and not create duplicate
    const sessionResult2 = await labService.startCollectionSession({
      requester: labTechUser,
      orderId,
      requestedClinicId: clinic._id
    });
    expect(sessionResult2.collectionSession.sessionId).toBe(sessionResult1.collectionSession.sessionId);
    expect(sessionResult2.isExisting).toBe(true);

    // Verify getCollectionSession endpoint
    const fetchedSession = await labService.getCollectionSession({
      requester: labTechUser,
      orderId,
      requestedClinicId: clinic._id
    });
    expect(fetchedSession.collectionSession.sessionId).toBe(sessionResult1.collectionSession.sessionId);
    expect(fetchedSession.order.status).toBe('ordered');
    expect(fetchedSession.collectionStatus).toBe('IN_PROGRESS');

    // 3. Perform Physical Sample Collection via Phlebotomy Desk
    const collectionResult = await labService.collectOrderSamples({
      requester: labTechUser,
      orderId,
      collectedSamples: [{
        specimenType: 'Whole Blood EDTA',
        containerType: 'Lavender Top (EDTA)',
        volume: '3 mL',
        notes: 'Specimen collected cleanly without hemolysis'
      }],
      clinicId: clinic._id
    });

    expect(collectionResult.order).toBeDefined();
    expect(collectionResult.order.status).toBe('sample_collected');
    expect(collectionResult.order.orderStatus).toBe('SAMPLE_COLLECTED');
    expect(collectionResult.order.collectionStatus).toBe('COLLECTED');
    expect(collectionResult.samples.length).toBe(1);
    expect(collectionResult.samples[0].sampleId).toBeDefined();
    expect(collectionResult.samples[0].status).toBe('COLLECTED');

    // 3. Lab Orders Master Controller advances to PROCESSING
    const processingOrder = await labService.updateLabOrderStatus({
      requester: labTechUser,
      labOrderId: orderId,
      status: 'in_processing',
      requestedClinicId: clinic._id
    });

    expect(['in_processing', 'processing']).toContain(processingOrder.status);
    expect(processingOrder.orderStatus).toBe('PROCESSING');

    // 4. Lab Orders Master Controller advances to RESULTS_ENTRY & fills test results
    const resultsEntryOrder = await labService.updateLabOrderStatus({
      requester: labTechUser,
      labOrderId: orderId,
      status: 'results_entry',
      requestedClinicId: clinic._id
    });

    expect(resultsEntryOrder.status).toBe('results_entry');
    expect(resultsEntryOrder.orderStatus).toBe('RESULTS_ENTRY');

    const { groups } = await labService.getOrderResults({
      requester: labTechUser,
      labOrderId: orderId,
      requestedClinicId: clinic._id
    });

    const resultsList = (groups || []).flatMap((g) => g.results || []);
    if (resultsList.length > 0) {
      await labService.saveResultsBatch({
        requester: labTechUser,
        labOrderId: orderId,
        results: resultsList.map((r) => ({
          resultId: r._id,
          value: '13.5',
          parameterName: r.parameterName
        })),
        requestedClinicId: clinic._id
      });
    }

    // 5. Mark Ready for Review
    const reviewOrder = await labService.updateLabOrderStatus({
      requester: labTechUser,
      labOrderId: orderId,
      status: 'ready_for_review',
      requestedClinicId: clinic._id
    });

    expect(reviewOrder.status).toBe('ready_for_review');
    expect(reviewOrder.orderStatus).toBe('READY_FOR_REVIEW');

    // 6. Pathologist Review & Finalization (COMPLETED)
    const completedOrder = await labService.updateLabOrderStatus({
      requester: doctorUser,
      labOrderId: orderId,
      status: 'completed',
      requestedClinicId: clinic._id
    });

    expect(completedOrder.status).toBe('completed');
    expect(['COMPLETED', 'REPORT_AVAILABLE']).toContain(completedOrder.orderStatus);
    expect(completedOrder.finalizedAt).toBeDefined();
  });

  test('Recollection Loop: Order -> Sample Collected -> Request Recollection -> RECOLLECTION_REQUIRED (Exact Same Order ID) -> Recollected -> Completed', async () => {
    // 1. Create Order
    const newOrder = await labService.createLabOrder({
      requester: patientUser,
      payload: {
        patientId: patientProfile._id,
        laboratoryId: labProvider._id,
        tests: [{
          labTestId: cbcTest._id,
          name: cbcTest.name,
          code: cbcTest.code,
          price: cbcTest.price,
          specimenType: cbcTest.specimenType
        }],
        collectionMethod: 'AT_LAB',
        source: 'PATIENT_BOOKED',
        paymentStatus: 'PAID',
        totalAmount: 350
      },
      requestedClinicId: clinic._id
    });

    const masterOrderId = newOrder._id;

    // 2. Initial Sample Collection
    const initialCollection = await labService.collectOrderSamples({
      requester: labTechUser,
      orderId: masterOrderId,
      collectedSamples: [{
        specimenType: 'Whole Blood EDTA',
        containerType: 'Lavender Top (EDTA)'
      }],
      clinicId: clinic._id
    });

    const initialSampleId = initialCollection.samples[0]._id;
    expect(initialCollection.order.status).toBe('sample_collected');

    // 3. Lab finds Hemolysis during processing and requests Recollection
    const rejectResult = await labService.rejectSample({
      requester: labTechUser,
      sampleId: initialSampleId,
      reason: 'Gross Hemolysis observed in initial EDTA tube. Recollection required.'
    });

    expect(rejectResult).toBeDefined();
    expect(rejectResult.status).toBe('REJECTED');

    // Verify Order Status transitioned to RECOLLECTION_REQUIRED on the EXACT SAME ORDER ID
    const recollectingOrder = await LabOrder.findById(masterOrderId);
    expect(recollectingOrder._id.toString()).toBe(masterOrderId.toString());
    expect(recollectingOrder.status).toBe('recollection_required');
    expect(recollectingOrder.orderStatus).toBe('RECOLLECTION_REQUIRED');
    expect(recollectingOrder.recollectionCount).toBe(1);

    // Verify original sample marked REJECTED
    const rejectedSample = await LabSample.findById(initialSampleId);
    expect(rejectedSample.status).toBe('REJECTED');
    expect(rejectedSample.rejectionReason).toContain('Hemolysis');

    // 4. Patient arrives for Recollection -> Phlebotomy performs second draw
    const secondCollection = await labService.collectOrderSamples({
      requester: labTechUser,
      orderId: masterOrderId,
      collectedSamples: [{
        specimenType: 'Whole Blood EDTA',
        containerType: 'Lavender Top (EDTA)',
        notes: 'Recollected clean specimen, no hemolysis'
      }],
      clinicId: clinic._id
    });

    expect(secondCollection.order._id.toString()).toBe(masterOrderId.toString());
    expect(secondCollection.order.status).toBe('sample_collected');
    expect(secondCollection.order.orderStatus).toBe('SAMPLE_COLLECTED');

    // 5. Verify Sample History on Order has both samples
    const orderDetails = await labService.getLabOrderById({
      requester: labTechUser,
      labOrderId: masterOrderId,
      requestedClinicId: clinic._id
    });

    expect(orderDetails.samples.length).toBe(2);
    expect(orderDetails.labOrder.hasRecollection).toBe(true);
    expect(orderDetails.labOrder.sampleHistory.length).toBe(2);
  });
});
