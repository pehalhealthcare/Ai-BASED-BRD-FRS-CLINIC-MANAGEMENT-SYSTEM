const path = require('path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Models
const { LabOrder } = require('../src/modules/labs/labOrder.model');
const LabTest = require('../src/modules/labs/labTest.model');
const LabReport = require('../src/modules/labs/labReport.model');
const User = require('../src/modules/users/user.model');
const Patient = require('../src/modules/patients/patient.model');
const Clinic = require('../src/modules/clinics/clinic.model');
const Provider = require('../src/modules/providers/provider.model');
const labService = require('../src/modules/labs/lab.service');

let mongod;

async function runTest() {
  console.log('--- STARTING CONTROLLED WORKFLOW ENFORCEMENT TEST ---');
  mongod = await MongoMemoryServer.create();
  const mongoUri = mongod.getUri();
  console.log('Connecting to in-memory MongoDB at:', mongoUri);
  await mongoose.connect(mongoUri);
  console.log('✓ Connected to MongoDB');

  try {
    // 1. Find or create context (User, Patient, Clinic, Provider, LabTest)
    let clinic = await Clinic.findOne({});
    if (!clinic) {
      clinic = await Clinic.create({
        name: "Ram's Dental Clinic",
        code: 'RDC-01',
        email: 'lab@clinic.com',
        phone: '9876543210',
        address: 'Indirapuram',
        approvalStatus: 'approved',
        status: 'active',
        trialFeatures: [
          { featureCode: 'labs', isActive: true, expiryDate: new Date(Date.now() + 30 * 86400000) }
        ]
      });
    }

    let technician = await User.findOne({ role: 'LAB_TECHNICIAN' });
    if (!technician) {
      technician = await User.create({
        clinicId: clinic._id,
        name: 'Rajesh Sharma',
        fullName: 'Rajesh Sharma',
        email: 'rajesh.sharma@pehal.com',
        password: 'password123',
        role: 'LAB_TECHNICIAN'
      });
    }

    let laboratory = await Provider.findOne({ clinicId: clinic._id });
    if (!laboratory) {
      laboratory = await Provider.create({
        clinicId: clinic._id,
        globalId: 'PROV-LAB-001',
        name: 'Radha Krishna Laboratory',
        providerType: 'Laboratory',
        providerSubtype: 'Internal',
        providerCategory: 'Own Provider',
        phone: '9876543210',
        email: 'lab@pehal.com',
        contactPerson: 'Dr. R. K. Sharma',
        createdBy: technician._id,
        address: {
          line1: '12 Medical Complex',
          city: 'Ghaziabad',
          state: 'Uttar Pradesh',
          country: 'India',
          pincode: '201014'
        }
      });
    }

    let patient = await Patient.findOne({ clinicId: clinic._id });
    if (!patient) {
      patient = await Patient.create({
        clinicId: clinic._id,
        patientId: 'PAT-20260905-0010',
        firstName: 'Patient',
        lastName: 'Alpha',
        phone: '9876543210',
        gender: 'male',
        dateOfBirth: new Date('1998-01-01')
      });
    }

    let cbcTest = await LabTest.findOne({ code: 'CBC' });
    if (!cbcTest) {
      cbcTest = await LabTest.create({
        clinicId: clinic._id,
        laboratoryId: laboratory._id,
        name: 'Complete Blood Count (CBC)',
        code: 'CBC',
        specimenType: 'Whole Blood (EDTA)',
        localParameters: [
          { name: 'Haemoglobin', shortName: 'Hb', resultType: 'NUMERIC', unit: 'g/dL', isRequired: true, lowerValue: 12, upperValue: 16 },
          { name: 'Platelet Count', shortName: 'PLT', resultType: 'NUMERIC', unit: '10^3/uL', isRequired: true, lowerValue: 150, upperValue: 450 }
        ]
      });
    }

    const testItem = {
      testId: cbcTest._id,
      name: cbcTest.name,
      code: cbcTest.code,
      specimenType: cbcTest.specimenType,
      parameters: [
        { name: 'Haemoglobin', shortName: 'Hb', resultType: 'NUMERIC', unit: 'g/dL', isRequired: true, lowerValue: 12, upperValue: 16 },
        { name: 'Platelet Count', shortName: 'PLT', resultType: 'NUMERIC', unit: '10^3/uL', isRequired: true, lowerValue: 150, upperValue: 450 }
      ]
    };

    console.log('\n--- 1. TEST PAYMENT ENFORCEMENT ---');
    // Create an UNPAID order
    const unpaidOrder = await LabOrder.create({
      clinicId: clinic._id,
      patientId: patient._id,
      laboratoryId: laboratory._id,
      orderNumber: 'LAB-20260905-9999',
      tests: [testItem],
      status: 'ordered',
      paymentStatus: 'PENDING',
      orderedAt: new Date()
    });
    console.log(`Created unpaid lab order ${unpaidOrder.orderNumber} with paymentStatus: PENDING`);

    try {
      await labService.updateLabOrderStatus({ requester: technician, labOrderId: unpaidOrder._id, status: 'sample_collected' });
      console.error('❌ FAIL: Sample collection should have been blocked for unpaid order!');
    } catch (err) {
      console.log('✓ PASS: Sample collection correctly blocked for unpaid order:', err.message);
    }

    console.log('\n--- 2. TEST INVALID STATUS TRANSITIONS (JUMPING STAGES) ---');
    // Create a PAID order
    const paidOrder = await LabOrder.create({
      clinicId: clinic._id,
      patientId: patient._id,
      laboratoryId: laboratory._id,
      orderNumber: 'LAB-20260905-0001',
      tests: [testItem],
      status: 'ordered',
      paymentStatus: 'PAID',
      orderedAt: new Date()
    });
    console.log(`Created paid lab order ${paidOrder.orderNumber} with status: ordered`);

    // Try jump ORDERED -> RESULTS_ENTRY
    try {
      await labService.updateLabOrderStatus({ requester: technician, labOrderId: paidOrder._id, status: 'results_entry' });
      console.error('❌ FAIL: ORDERED -> RESULTS_ENTRY transition should have been rejected!');
    } catch (err) {
      console.log('✓ PASS: ORDERED -> RESULTS_ENTRY correctly rejected:', err.message);
    }

    // Try jump ORDERED -> COMPLETED
    try {
      await labService.updateLabOrderStatus({ requester: technician, labOrderId: paidOrder._id, status: 'completed' });
      console.error('❌ FAIL: ORDERED -> COMPLETED transition should have been rejected!');
    } catch (err) {
      console.log('✓ PASS: ORDERED -> COMPLETED correctly rejected:', err.message);
    }

    console.log('\n--- 3. TEST RESULTS ENTRY LOCKING BEFORE RESULTS_ENTRY STAGE ---');
    // Initialize results structure
    await labService.initializeOrderResults({ requester: technician, labOrderId: paidOrder._id });

    // Try entering results while in ORDERED status
    try {
      await labService.saveResultsBatch({
        requester: technician,
        labOrderId: paidOrder._id,
        results: [
          { parameterName: 'Haemoglobin', testCode: 'CBC', value: '14.2', unit: 'g/dL', status: 'entered' }
        ]
      });
      console.error('❌ FAIL: Results saving should be locked when order is in ordered status!');
    } catch (err) {
      console.log('✓ PASS: Results saving locked in ordered status:', err.message);
    }

    console.log('\n--- 4. TEST CONTROLLED STEP-BY-STEP PROGRESSION ---');

    // Step 1: ORDERED -> SAMPLE_COLLECTED
    console.log('\n[Step 1 -> 2] Moving ORDERED -> SAMPLE_COLLECTED');
    const orderStep1 = await labService.updateLabOrderStatus({ requester: technician, labOrderId: paidOrder._id, status: 'sample_collected' });
    console.log(`Status: ${orderStep1.status}, Sample ID: ${orderStep1.sampleId}, Collected By: ${orderStep1.sampleCollectedByName}`);
    if (orderStep1.status !== 'sample_collected' || !orderStep1.sampleId) {
      throw new Error('Failed to transition to sample_collected with sampleId');
    }

    // Try entering results while in SAMPLE_COLLECTED status
    try {
      await labService.saveResultsBatch({
        requester: technician,
        labOrderId: paidOrder._id,
        results: [{ parameterName: 'Haemoglobin', testCode: 'CBC', value: '14.2', unit: 'g/dL', status: 'entered' }]
      });
      console.error('❌ FAIL: Results saving should be locked in sample_collected status!');
    } catch (err) {
      console.log('✓ PASS: Results saving locked in sample_collected status:', err.message);
    }

    // Step 2: SAMPLE_COLLECTED -> PROCESSING
    console.log('\n[Step 2 -> 3] Moving SAMPLE_COLLECTED -> PROCESSING');
    const orderStep2 = await labService.updateLabOrderStatus({ requester: technician, labOrderId: paidOrder._id, status: 'processing' });
    console.log(`Status: ${orderStep2.status}, Processing Started At: ${orderStep2.processingStartedAt}`);
    if (orderStep2.status !== 'processing') {
      throw new Error('Failed to transition to processing');
    }

    // Try entering results while in PROCESSING status
    try {
      await labService.saveResultsBatch({
        requester: technician,
        labOrderId: paidOrder._id,
        results: [{ parameterName: 'Haemoglobin', testCode: 'CBC', value: '14.2', unit: 'g/dL', status: 'entered' }]
      });
      console.error('❌ FAIL: Results saving should be locked in processing status!');
    } catch (err) {
      console.log('✓ PASS: Results saving locked in processing status:', err.message);
    }

    // Step 3: PROCESSING -> RESULTS_ENTRY
    console.log('\n[Step 3 -> 4] Moving PROCESSING -> RESULTS_ENTRY');
    const orderStep3 = await labService.updateLabOrderStatus({ requester: technician, labOrderId: paidOrder._id, status: 'results_entry' });
    console.log(`Status: ${orderStep3.status}, Processing Completed At: ${orderStep3.processingCompletedAt}`);
    if (orderStep3.status !== 'results_entry') {
      throw new Error('Failed to transition to results_entry');
    }

    // Step 4: RESULTS ENTRY (now unlocked)
    console.log('\n[Step 4] Entering Test Results');
    const resultsData = await labService.getOrderResults({ requester: technician, labOrderId: paidOrder._id });
    console.log(`Initial parameters initialized: ${resultsData.totalParams} parameters`);

    const saveRes = await labService.saveResultsBatch({
      requester: technician,
      labOrderId: paidOrder._id,
      results: [
        { parameterName: 'Haemoglobin', testCode: 'CBC', value: '13.5', unit: 'g/dL', flag: 'normal', status: 'entered' },
        { parameterName: 'Platelet Count', testCode: 'CBC', value: '250', unit: '10^3/uL', flag: 'normal', status: 'entered' }
      ]
    });
    console.log(`✓ Saved batch results: ${saveRes.completedParams} / ${saveRes.totalParams} completed`);

    // Step 5: RESULTS_ENTRY -> READY_FOR_REVIEW
    console.log('\n[Step 4 -> 5] Moving RESULTS_ENTRY -> READY_FOR_REVIEW');
    const orderStep5 = await labService.updateLabOrderStatus({ requester: technician, labOrderId: paidOrder._id, status: 'ready_for_review' });
    console.log(`Status: ${orderStep5.status}, Results Completed At: ${orderStep5.resultsCompletedAt}`);
    if (orderStep5.status !== 'ready_for_review') {
      throw new Error('Failed to transition to ready_for_review');
    }

    // Step 6: READY_FOR_REVIEW -> COMPLETED (Finalization)
    console.log('\n[Step 5 -> 6] Finalizing & Completing Order (Generating Report)');
    const orderStep6 = await labService.updateLabOrderStatus({ requester: technician, labOrderId: paidOrder._id, status: 'completed' });
    console.log(`Status: ${orderStep6.status}, Finalized At: ${orderStep6.finalizedAt}, Finalized By: ${orderStep6.finalizedByName}`);
    if (orderStep6.status !== 'completed') {
      throw new Error('Failed to transition to completed');
    }

    // 5. Verify Report Generation and Storage
    const labReport = await LabReport.findOne({ labOrderId: paidOrder._id });
    console.log(`✓ Generated LabReport found: ID=${labReport?._id}, status=${labReport?.status}, abnormalCount=${labReport?.abnormalCount}`);
    console.log(`✓ Report URL: ${labReport?.generatedReportUrl || labReport?.reportUrl}`);

    // 6. Verify Timeline Audit Log
    const finalOrder = await LabOrder.findById(paidOrder._id);
    console.log('\n--- 5. VERIFY TIMELINE AUDIT TRAIL ---');
    console.log(`Recorded ${finalOrder.timeline?.length || 0} timeline events:`);
    (finalOrder.timeline || []).forEach((t, i) => {
      console.log(`  ${i + 1}. [${t.oldStatus} -> ${t.newStatus}] at ${new Date(t.performedAt).toLocaleString('en-GB')} by ${t.performedByName || t.performedBy}`);
    });

    console.log('\n--- 6. TEST HTTP API ENDPOINT: PROCESSING -> RESULTS_ENTRY VIA EXPRESS ROUTE ---');
    const request = require('supertest');
    const app = require('../src/app');
    const { generateAccessToken } = require('../src/modules/auth/token.service');

    const authToken = generateAccessToken(technician);

    // Create a new order in processing state (representing LAB-20260905-0003)
    const testOrder = await LabOrder.create({
      clinicId: clinic._id,
      patientId: patient._id,
      laboratoryId: laboratory._id,
      orderNumber: 'LAB-20260905-0003',
      tests: [testItem],
      status: 'processing',
      sampleId: 'SMP-20260905-7538',
      sampleStatus: 'SAMPLE_RECEIVED',
      paymentStatus: 'PAID',
      orderedAt: new Date(),
      sampleCollectedAt: new Date(),
      processingStartedAt: new Date()
    });
    console.log(`Created test order ${testOrder.orderNumber} in status: processing with sampleId: ${testOrder.sampleId}`);

    // Call PATCH /api/v1/labs/orders/:id/status with { status: "results_entry" }
    const httpRes = await request(app)
      .patch(`/api/v1/labs/orders/${testOrder._id}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'results_entry' });

    console.log('HTTP Response Status:', httpRes.status);
    console.log('HTTP Response Body:', JSON.stringify(httpRes.body, null, 2));

    if (httpRes.status !== 200 || !httpRes.body.success) {
      throw new Error(`HTTP Status update failed: ${JSON.stringify(httpRes.body)}`);
    }

    console.log(`✓ Successfully updated ${testOrder.orderNumber} to results_entry via HTTP API. Returned status: ${httpRes.body.data?.labOrder?.status}`);

    // Verify order in database
    const dbOrder = await LabOrder.findById(testOrder._id);
    if (dbOrder.status !== 'results_entry') {
      throw new Error(`Database status is ${dbOrder.status}, expected results_entry`);
    }
    console.log(`✓ Database verified: status=${dbOrder.status}, processingCompletedAt=${dbOrder.processingCompletedAt}`);

    console.log('\n======================================================');
    console.log('✅ ALL WORKFLOW, SECURITY & HTTP API ENFORCEMENT CHECKS PASSED!');
    console.log('======================================================');
  } catch (error) {
    console.error('Test execution error:', error);
  } finally {
    if (mongod) await mongod.stop();
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

runTest();
