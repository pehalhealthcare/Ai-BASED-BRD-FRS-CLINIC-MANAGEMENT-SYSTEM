const path = require('path');
const BACKEND_ROOT = path.resolve(__dirname, '..');
const { connectDB, disconnectDB } = require(path.join(BACKEND_ROOT, 'src/config/database'));
const User = require(path.join(BACKEND_ROOT, 'src/modules/users/user.model'));
const { generateAccessToken } = require(path.join(BACKEND_ROOT, 'src/modules/auth/token.service'));

const BASE_URL = 'http://localhost:5001/api/v1';

async function runE2ETests() {
  console.log('===============================================================');
  console.log('STARTING UNIFIED LABORATORY WORKFLOW E2E VERIFICATION TEST');
  console.log('===============================================================');

  // 1. Authenticate / Generate Token
  console.log('\n--- 1. AUTHENTICATING / RETRIEVING ADMIN CONTEXT ---');
  await connectDB();
  let adminUser = await User.findOne({ role: 'SUPER_ADMIN', isActive: true });
  if (!adminUser) {
    adminUser = await User.findOne({ role: { $in: ['ADMIN', 'LAB_TECHNICIAN'] }, isActive: true });
  }
  if (!adminUser) {
    throw new Error('No admin/staff user found in database');
  }

  const token = generateAccessToken(adminUser);
  console.log(`✓ Token generated for ${adminUser.email} (Role: ${adminUser.role})`);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  // --------------------------------------------------------------------------
  // SCENARIO 1: HOME COLLECTION ORDER (Simulating Patient Portal Checkout)
  // --------------------------------------------------------------------------
  console.log('\n--- 2. SCENARIO 1: HOME COLLECTION LAB ORDER ---');
  const homeOrderPayload = {
    patientType: 'WALK_IN',
    nonRegisteredPatientDetails: {
      fullName: 'Vidya Sharma (Home Test)',
      phone: '9876501234',
      email: 'vidya.sharma@example.com',
      age: 29,
      gender: 'female',
      address: 'Plot 42, Green Park, South Delhi'
    },
    priority: 'routine',
    collectionMode: 'HOME_COLLECTION',
    collectionMethod: 'HOME_COLLECTION',
    scheduledCollectionDate: '2026-09-08',
    scheduledCollectionStartTime: '08:00 AM',
    scheduledCollectionEndTime: '10:00 AM',
    paymentStatus: 'PAID',
    paymentMethod: 'ONLINE',
    source: 'PATIENT_BOOKED',
    notes: 'Home collection test for unified workflow',
    tests: [
      {
        name: 'Complete Blood Count (CBC)',
        code: 'CBC',
        category: 'Hematology',
        specimenType: 'EDTA Whole Blood (3ml)',
        price: 450,
        turnaroundTime: '4 hours'
      },
      {
        name: 'Vitamin D (25-OH)',
        code: 'VITD',
        category: 'Biochemistry',
        specimenType: 'Serum (SST Gel Tube 5ml)',
        price: 1200,
        turnaroundTime: '24 hours'
      }
    ]
  };

  const createHomeRes = await fetch(`${BASE_URL}/labs/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify(homeOrderPayload)
  });
  const createHomeData = await createHomeRes.json();
  if (!createHomeRes.ok || !createHomeData.success) {
    throw new Error('Failed to create Home Collection Lab Order: ' + JSON.stringify(createHomeData));
  }
  const homeOrder = createHomeData.data.labOrder || createHomeData.data.order;
  console.log(`✓ Created Canonical Lab Order: ${homeOrder.orderNumber} (ID: ${homeOrder._id})`);
  console.log(`  - Status: ${homeOrder.status}`);
  console.log(`  - Collection Mode: ${homeOrder.collectionMode}`);
  console.log(`  - Collection Token: ${homeOrder.collectionToken}`);
  console.log(`  - QR Payload generated: ${Boolean(homeOrder.collectionQrPayload)}`);

  // Verify QR Payload content
  if (!homeOrder.collectionQrPayload) {
    throw new Error('Expected collectionQrPayload on order');
  }
  const parsedQrPayload = JSON.parse(homeOrder.collectionQrPayload);
  console.log(`✓ Decoded QR payload: orderNumber=${parsedQrPayload.orderNumber}, token=${parsedQrPayload.token}, mode=${parsedQrPayload.collectionMode}`);

  // Test Universal Scan Lookup via POST /labs/lookup-scan with QR payload string
  console.log('\n--- 3. UNIVERSAL SCAN LOOKUP (VERIFY COLLECTION MODAL BACKEND) ---');
  const scanRes = await fetch(`${BASE_URL}/labs/lookup-scan`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ code: homeOrder.collectionQrPayload })
  });
  const scanData = await scanRes.json();
  if (!scanRes.ok || !scanData.success) {
    throw new Error('Lookup scan failed: ' + JSON.stringify(scanData));
  }
  const verifyResult = scanData.data;
  console.log(`✓ Universal Scan Response:`);
  console.log(`  - Validation Status: ${verifyResult.validationStatus}`);
  console.log(`  - Patient: ${verifyResult.patient?.fullName} (${verifyResult.patient?.age} ${verifyResult.patient?.gender})`);
  console.log(`  - Order Number: ${verifyResult.order?.orderNumber}`);
  console.log(`  - Collection Mode: ${verifyResult.collectionMode}`);
  console.log(`  - Payment Status: ${verifyResult.paymentStatus}`);
  console.log(`  - Tests count: ${verifyResult.order?.tests?.length}`);
  console.log(`  - Specimen containers required: ${verifyResult.requiredSpecimens?.length}`);

  if (verifyResult.validationStatus !== 'READY_FOR_COLLECTION') {
    throw new Error(`Expected validationStatus 'READY_FOR_COLLECTION', got '${verifyResult.validationStatus}'`);
  }

  // --------------------------------------------------------------------------
  // SCENARIO 2: AT-LAB ORDER + COLLECTION + SAMPLE REJECTION & RECOLLECTION CYCLE
  // --------------------------------------------------------------------------
  console.log('\n--- 4. SCENARIO 2: AT-LABORATORY ORDER & RECOLLECTION CYCLE ---');
  const labOrderPayload = {
    patientType: 'WALK_IN',
    nonRegisteredPatientDetails: {
      fullName: 'Rahul Verma (Recollection Test)',
      phone: '9811223344',
      email: 'rahul.verma@example.com',
      age: 41,
      gender: 'male',
      address: 'Connaught Place, Central Delhi'
    },
    priority: 'urgent',
    collectionMode: 'AT_LABORATORY',
    collectionMethod: 'AT_LAB',
    paymentStatus: 'PAID',
    paymentMethod: 'CASH',
    source: 'LAB_CREATED',
    notes: 'Testing sample rejection and recollection lifecycle',
    tests: [
      {
        name: 'Lipid Profile Comprehensive',
        code: 'LIPID',
        category: 'Biochemistry',
        specimenType: 'Serum (SST Gel Tube 5ml)',
        price: 850,
        turnaroundTime: '6 hours'
      }
    ]
  };

  const createLabRes = await fetch(`${BASE_URL}/labs/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify(labOrderPayload)
  });
  const createLabData = await createLabRes.json();
  if (!createLabRes.ok || !createLabData.success) {
    throw new Error('Failed to create At-Lab Order: ' + JSON.stringify(createLabData));
  }
  const labOrder = createLabData.data.labOrder || createLabData.data.order;
  console.log(`✓ Created At-Lab Canonical Order: ${labOrder.orderNumber} (ID: ${labOrder._id})`);

  // Perform Sample Collection
  console.log('\n--- 5. PERFORM INITIAL SAMPLE COLLECTION ---');
  const collectRes = await fetch(`${BASE_URL}/labs/orders/${labOrder._id}/collect-samples`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      collectorNotes: 'Collected successfully at Main Phlebotomy station',
      specimens: [
        {
          specimenType: 'Serum (SST Gel Tube 5ml)',
          volume: '5ml',
          containerType: 'Gold Top SST Tube'
        }
      ]
    })
  });
  const collectData = await collectRes.json();
  if (!collectRes.ok || !collectData.success) {
    throw new Error('Sample collection failed: ' + JSON.stringify(collectData));
  }
  const collectedSamples = collectData.data.samples || [];
  const primarySample = collectedSamples[0];
  console.log(`✓ Sample 1 Collected!`);
  console.log(`  - Sample ID: ${primarySample.sampleId}`);
  console.log(`  - Sample Status: ${primarySample.status}`);
  console.log(`  - Order Status: ${collectData.data.order?.status}`);

  if (collectData.data.order?.status !== 'sample_collected') {
    throw new Error(`Expected order status 'sample_collected', got '${collectData.data.order?.status}'`);
  }

  // Reject Sample 1 (Quality Rejection)
  console.log('\n--- 6. REJECT SAMPLE 1 (HEMOLYZED SPECIMEN) ---');
  const rejectRes = await fetch(`${BASE_URL}/labs/samples/${primarySample._id}/reject`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      reason: 'HEMOLYZED',
      notes: 'Gross hemolysis detected in serum separator tube during centrifugation'
    })
  });
  const rejectData = await rejectRes.json();
  if (!rejectRes.ok || !rejectData.success) {
    throw new Error('Sample rejection failed: ' + JSON.stringify(rejectData));
  }
  console.log(`✓ Sample 1 Rejected!`);
  console.log(`  - Rejection Reason: ${rejectData.data.sample?.rejectionReason}`);
  console.log(`  - Sample Status: ${rejectData.data.sample?.status}`);

  // Verify Order Details & Sample History
  console.log('\n--- 7. VERIFY ORDER DETAILS & SAMPLE AUDIT HISTORY ---');
  const getOrderRes = await fetch(`${BASE_URL}/labs/orders/${labOrder._id}`, { headers });
  const getOrderData = await getOrderRes.json();
  const orderDetails = getOrderData.data.order || getOrderData.data.labOrder;
  console.log(`✓ Retrieved Lab Order Details:`);
  console.log(`  - Status: ${orderDetails.status}`);
  console.log(`  - Has Recollection Flag: ${orderDetails.hasRecollection}`);
  console.log(`  - Total Samples on Record: ${orderDetails.samples?.length}`);
  console.log(`  - Sample History Count: ${orderDetails.sampleHistory?.length}`);

  if (orderDetails.status !== 'recollection_required') {
    throw new Error(`Expected order status 'recollection_required', got '${orderDetails.status}'`);
  }
  if (orderDetails.samples?.[0]?.status !== 'REJECTED') {
    throw new Error('Expected Sample 1 status to be REJECTED in order details');
  }

  // Universal Scan Lookup when in RECOLLECTION state
  console.log('\n--- 8. UNIVERSAL SCAN LOOKUP DURING RECOLLECTION STATE ---');
  const scanRecollectRes = await fetch(`${BASE_URL}/labs/lookup-scan?code=${labOrder.orderNumber}`, { headers });
  const scanRecollectData = await scanRecollectRes.json();
  const recollectVerify = scanRecollectData.data;
  console.log(`✓ Scan Lookup in Recollection Mode:`);
  console.log(`  - Validation Status: ${recollectVerify.validationStatus}`);
  console.log(`  - Is Recollection: ${recollectVerify.isRecollection}`);
  console.log(`  - Recollection Reason: ${recollectVerify.recollectionReason}`);

  if (recollectVerify.validationStatus !== 'RECOLLECTION_READY') {
    throw new Error(`Expected validationStatus 'RECOLLECTION_READY', got '${recollectVerify.validationStatus}'`);
  }

  // Perform Recollection (Collect Replacement Sample)
  console.log('\n--- 9. COLLECT REPLACEMENT SAMPLE (RECOLLECTION) ---');
  const recollectActionRes = await fetch(`${BASE_URL}/labs/samples/${primarySample._id}/recollect`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      notes: 'Fresh collection performed from left antecubital vein, standard 21G needle',
      deskNumber: 'Desk 1'
    })
  });
  const recollectActionData = await recollectActionRes.json();
  if (!recollectActionRes.ok || !recollectActionData.success) {
    throw new Error('Recollection action failed: ' + JSON.stringify(recollectActionData));
  }
  const replacementSample = recollectActionData.data.sample;
  console.log(`✓ Replacement Sample 2 Created!`);
  console.log(`  - New Sample ID: ${replacementSample.sampleId}`);
  console.log(`  - Linked to Previous Sample: ${replacementSample.recollectionOfSampleId}`);

  // Verify Sample History after Recollection
  const finalOrderRes = await fetch(`${BASE_URL}/labs/orders/${labOrder._id}`, { headers });
  const finalOrderData = await finalOrderRes.json();
  const finalOrder = finalOrderData.data.order || finalOrderData.data.labOrder;
  console.log(`\n--- 10. FINAL SAMPLE AUDIT VERIFICATION ---`);
  console.log(`✓ Order Status restored to: ${finalOrder.status}`);
  console.log(`✓ Active Sample ID: ${finalOrder.activeSample?.sampleId || finalOrder.activeSampleId}`);
  console.log(`✓ All Samples Count: ${finalOrder.samples?.length}`);
  finalOrder.samples.forEach((s, idx) => {
    console.log(`  [Sample ${idx + 1}] ID: ${s.sampleId} | Status: ${s.status} | Reason: ${s.rejectionReason || 'N/A'} | RecollectedFrom: ${s.recollectionOfSampleId || 'None'}`);
  });

  if (finalOrder.status !== 'sample_collected') {
    throw new Error(`Expected order status 'sample_collected', got '${finalOrder.status}'`);
  }

  // Verify Collection Queue Dashboard
  console.log('\n--- 11. VERIFY COLLECTION QUEUE DASHBOARD STATS ---');
  const queueRes = await fetch(`${BASE_URL}/labs/collection-queue`, { headers });
  const queueData = await queueRes.json();
  console.log(`✓ Queue Dashboard:`);
  console.log(`  - Pending Collections: ${queueData.data?.metrics?.awaitingCollection}`);
  console.log(`  - Samples Collected Today: ${queueData.data?.metrics?.samplesCollected}`);
  console.log(`  - Recollections Required: ${queueData.data?.metrics?.recollectionRequired}`);
  console.log(`  - Today Orders List Length: ${queueData.data?.todayOrders?.length}`);

  console.log('\n===============================================================');
  console.log('ALL UNIFIED LABORATORY WORKFLOW VERIFICATION TESTS PASSED (100%)');
  console.log('===============================================================');

  await disconnectDB();
  process.exit(0);
}

runE2ETests().catch(async (err) => {
  console.error('\n❌ E2E TEST FAILED:', err.message);
  console.error(err);
  try { await disconnectDB(); } catch (_) {}
  process.exit(1);
});
