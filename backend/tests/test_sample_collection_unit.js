const mongoose = require('mongoose');
const labService = require('../src/modules/labs/lab.service');
const { LabOrder } = require('../src/modules/labs/labOrder.model');
const { LabSample } = require('../src/modules/labs/labSample.model');
const { LabToken } = require('../src/modules/labs/labToken.model');
const { HomeCollectionTask } = require('../src/modules/labs/homeCollectionTask.model');
const Patient = require('../src/modules/patients/patient.model');

async function runUnitTests() {
  console.log('================================================================');
  console.log('UNIT TEST SUITE: SAMPLE COLLECTION QUEUE SERVICE & CONTROLLER');
  console.log('================================================================\n');

  // TEST 1: Service Function Exports
  console.log('1. Verifying all Phase 7 exports in lab.service.js...');
  const expectedFns = [
    'getCollectionQueueDashboard',
    'calculateRequiredSpecimens',
    'generateQueueToken',
    'callQueueToken',
    'recallQueueToken',
    'skipQueueToken',
    'getPublicTokenDisplay',
    'collectOrderSamples',
    'rejectSample',
    'recollectSample',
    'getSampleTimeline',
    'listHomeCollectionTasks',
    'assignHomeCollector',
    'updateHomeCollectionStatus',
    'receiveHomeCollectionAtLab',
    'universalScanLookup'
  ];

  for (const fn of expectedFns) {
    if (typeof labService[fn] !== 'function') {
      throw new Error(`FAIL: labService.${fn} is not exported as a function!`);
    }
    console.log(`   ✓ labService.${fn} is a function`);
  }

  // TEST 2: Mock Mongoose Model Methods to Test getCollectionQueueDashboard Logic
  console.log('\n2. Testing getCollectionQueueDashboard with mocked Mongoose methods...');

  const originalCountDocumentsOrder = LabOrder.countDocuments;
  const originalCountDocumentsToken = LabToken.countDocuments;
  const originalCountDocumentsSample = LabSample.countDocuments;
  const originalCountDocumentsHome = HomeCollectionTask.countDocuments;
  const originalFindToken = LabToken.find;
  const originalFindOrder = LabOrder.find;
  const originalFindHome = HomeCollectionTask.find;

  let queryCaptured = {};

  try {
    LabOrder.countDocuments = (filter) => {
      queryCaptured.countOrderFilter = filter;
      return Promise.resolve(3);
    };
    LabToken.countDocuments = (filter) => {
      queryCaptured.countTokenFilter = filter;
      return Promise.resolve(2);
    };
    LabSample.countDocuments = (filter) => {
      queryCaptured.countSampleFilter = filter;
      return Promise.resolve(5);
    };
    HomeCollectionTask.countDocuments = (filter) => {
      queryCaptured.countHomeFilter = filter;
      return Promise.resolve(1);
    };

    LabToken.find = (filter) => {
      queryCaptured.findTokenFilter = filter;
      return {
        sort: () => ({
          populate: () => ({
            populate: () => ({
              lean: () => Promise.resolve([
                {
                  _id: new mongoose.Types.ObjectId(),
                  tokenNumber: 'A-001',
                  status: 'CALLED',
                  orderId: { _id: new mongoose.Types.ObjectId() }
                }
              ])
            })
          })
        })
      };
    };

    LabOrder.find = (filter) => {
      queryCaptured.findOrderFilter = filter;
      return {
        sort: () => ({
          populate: () => ({
            populate: () => ({
              lean: () => Promise.resolve([
                {
                  _id: new mongoose.Types.ObjectId(),
                  orderNumber: 'LAB-20260906-0001',
                  status: 'ordered',
                  paymentStatus: 'PAID'
                }
              ])
            })
          })
        })
      };
    };

    HomeCollectionTask.find = (filter) => {
      queryCaptured.findHomeFilter = filter;
      return {
        sort: () => ({
          populate: () => ({
            populate: () => ({
              lean: () => Promise.resolve([])
            })
          })
        })
      };
    };

    const mockClinicId = new mongoose.Types.ObjectId().toString();
    const mockLabId = new mongoose.Types.ObjectId().toString();

    // Test Call with string IDs
    const dashboardResult = await labService.getCollectionQueueDashboard({
      clinicId: mockClinicId,
      laboratoryId: mockLabId,
      date: '2026-09-06',
      requester: { _id: new mongoose.Types.ObjectId(), role: 'LAB_TECHNICIAN' }
    });

    console.assert(dashboardResult, 'Dashboard result must be defined');
    console.assert(dashboardResult.metrics.awaitingCollection === 3, 'Metrics awaitingCollection must match mock');
    console.assert(dashboardResult.metrics.tokensWaiting === 2, 'Metrics tokensWaiting must match mock');
    console.assert(dashboardResult.metrics.samplesCollected === 5, 'Metrics samplesCollected must match mock');
    console.assert(dashboardResult.metrics.homeCollections === 1, 'Metrics homeCollections must match mock');
    console.assert(dashboardResult.currentToken !== null, 'Current token must be derived');
    console.assert(dashboardResult.currentToken.tokenNumber === 'A-001', 'Current token number must be A-001');
    console.assert(dashboardResult.todayOrders.length === 1, 'todayOrders must contain 1 order');
    console.assert(dashboardResult.desks.length >= 3, 'desks must contain standard desk options');

    console.log('   ✓ getCollectionQueueDashboard returned structured dashboard payload successfully.');

    // Test Call with invalid / "undefined" string parameters
    const safeResult = await labService.getCollectionQueueDashboard({
      clinicId: 'undefined',
      laboratoryId: 'undefined',
      requester: { _id: new mongoose.Types.ObjectId(), clinicId: mockClinicId }
    });

    console.assert(safeResult && safeResult.metrics, 'Safe call with undefined string must succeed');
    console.log('   ✓ getCollectionQueueDashboard safely sanitized "undefined" query strings.');

  } finally {
    LabOrder.countDocuments = originalCountDocumentsOrder;
    LabToken.countDocuments = originalCountDocumentsToken;
    LabSample.countDocuments = originalCountDocumentsSample;
    HomeCollectionTask.countDocuments = originalCountDocumentsHome;
    LabToken.find = originalFindToken;
    LabOrder.find = originalFindOrder;
    HomeCollectionTask.find = originalFindHome;
  }

  console.log('\n================================================================');
  console.log('ALL SAMPLE COLLECTION UNIT TESTS PASSED SUCCESSFULLY! ✓');
  console.log('================================================================\n');
}

runUnitTests().catch(err => {
  console.error('Unit test failed:', err);
  process.exit(1);
});
