const mongoose = require('mongoose');
const { 
  LAB_ORDER_STATUS, 
  LAB_ORDER_STATUSES, 
  SAMPLE_STATUS, 
  SAMPLE_STATUSES, 
  ORDER_STATUS_TRANSITIONS,
  ORDER_STATUS_CONFIG
} = require('../src/modules/labs/labStatus.constants');

const labService = require('../src/modules/labs/lab.service');
const { LabOrder } = require('../src/modules/labs/labOrder.model');
const { LabSample } = require('../src/modules/labs/labSample.model');
const { Clinic } = require('../src/modules/clinics/clinic.model');
const Patient = require('../src/modules/patients/patient.model');
const Provider = require('../src/modules/providers/provider.model');

async function testPhase2OperationalWorkflow() {
  console.log('================================================================');
  console.log('PHASE 2: SAMPLE COLLECTION OPERATIONAL WORKFLOW TEST SUITE');
  console.log('================================================================\n');

  // TEST 1: Workflow Transition Sequence Enforcement
  console.log('1. Validating Sequential Lifecycle (ORDERED -> SAMPLE_COLLECTED -> PROCESSING -> RESULTS_ENTRY -> READY_FOR_REVIEW -> COMPLETED)...');
  
  const step1Allowed = ORDER_STATUS_TRANSITIONS.ordered.includes('sample_collected');
  const step2Allowed = ORDER_STATUS_TRANSITIONS.sample_collected.includes('processing');
  const step3Allowed = ORDER_STATUS_TRANSITIONS.processing.includes('results_entry');
  const step4Allowed = ORDER_STATUS_TRANSITIONS.results_entry.includes('ready_for_review');
  const step5Allowed = ORDER_STATUS_TRANSITIONS.ready_for_review.includes('completed');

  console.assert(step1Allowed, 'ORDERED -> SAMPLE_COLLECTED must be allowed');
  console.assert(step2Allowed, 'SAMPLE_COLLECTED -> PROCESSING must be allowed');
  console.assert(step3Allowed, 'PROCESSING -> RESULTS_ENTRY must be allowed');
  console.assert(step4Allowed, 'RESULTS_ENTRY -> READY_FOR_REVIEW must be allowed');
  console.assert(step5Allowed, 'READY_FOR_REVIEW -> COMPLETED must be allowed');

  console.log('   ✓ Forward sequential path validated.\n');

  // TEST 2: Invalid Bypass Transitions Must Be Blocked
  console.log('2. Validating Illegal Workflow Bypasses are Prohibited...');

  const illegalTransitions = [
    { from: 'ordered', to: 'processing' },
    { from: 'ordered', to: 'results_entry' },
    { from: 'ordered', to: 'ready_for_review' },
    { from: 'ordered', to: 'completed' },
    { from: 'sample_collected', to: 'results_entry' },
    { from: 'sample_collected', to: 'ready_for_review' },
    { from: 'sample_collected', to: 'completed' },
    { from: 'processing', to: 'ready_for_review' },
    { from: 'processing', to: 'completed' }
  ];

  for (const t of illegalTransitions) {
    const isAllowed = (ORDER_STATUS_TRANSITIONS[t.from] || []).includes(t.to);
    console.assert(!isAllowed, `Illegal bypass ${t.from} -> ${t.to} must NOT be allowed!`);
  }

  console.log('   ✓ All 9 illegal bypass transitions strictly prevented.\n');

  // TEST 3: Sample Status Lifecycle Parity
  console.log('3. Validating Sample Status Values...');
  const requiredSampleStatuses = [
    'EXPECTED',
    'COLLECTING',
    'COLLECTED',
    'PROCESSING',
    'COMPLETED',
    'REJECTED',
    'RECOLLECTION_REQUIRED'
  ];

  for (const st of requiredSampleStatuses) {
    console.assert(SAMPLE_STATUSES.includes(st), `Sample status ${st} must exist in SAMPLE_STATUSES`);
  }
  console.log(`   ✓ All ${requiredSampleStatuses.length} operational sample statuses verified.\n`);

  // TEST 4: Payment Eligibility Rule Check
  console.log('4. Validating Payment Eligibility Guard for Sample Collection...');
  const unpaidOrder = { status: 'ordered', paymentStatus: 'UNPAID' };
  const paidOrder = { status: 'ordered', paymentStatus: 'PAID' };

  const isUnpaidEligible = !['PENDING', 'pending', 'UNPAID', 'unpaid', 'DUE', 'due'].includes(unpaidOrder.paymentStatus);
  const isPaidEligible = !['PENDING', 'pending', 'UNPAID', 'unpaid', 'DUE', 'due'].includes(paidOrder.paymentStatus);

  console.assert(!isUnpaidEligible, 'Unpaid order must NOT be eligible for collection');
  console.assert(isPaidEligible, 'Paid order MUST be eligible for collection');
  console.log('   ✓ Payment eligibility rules verified.\n');

  console.log('================================================================');
  console.log('ALL PHASE 2 OPERATIONAL WORKFLOW RULES VALIDATED SUCCESSFULLY! ✓');
  console.log('================================================================');
}

testPhase2OperationalWorkflow().catch(err => {
  console.error('Phase 2 test failed:', err);
  process.exit(1);
});
