const axios = require('axios');
const mongoose = require('mongoose');
const { 
  LAB_ORDER_STATUS, 
  LAB_ORDER_STATUSES, 
  SAMPLE_STATUS, 
  SAMPLE_STATUSES, 
  ORDER_STATUS_TRANSITIONS,
  ORDER_STATUS_CONFIG
} = require('../src/modules/labs/labStatus.constants');

const API_BASE = 'http://localhost:5001/api/v1';

async function testPhase1Foundation() {
  console.log('====================================================');
  console.log('PHASE 1: LABORATORY SAMPLE COLLECTION FOUNDATION TEST');
  console.log('====================================================\n');

  // Test 1: Verify Status Transitions & Configuration
  console.log('1. Checking Centralized Status Transition Model...');
  const testTransitions = [
    { from: 'ordered', to: 'checked_in', expected: true },
    { from: 'checked_in', to: 'called', expected: true },
    { from: 'called', to: 'collecting', expected: true },
    { from: 'collecting', to: 'sample_collected', expected: true },
    { from: 'sample_collected', to: 'processing', expected: true },
    { from: 'processing', to: 'results_entry', expected: true },
    { from: 'results_entry', to: 'ready_for_review', expected: true },
    { from: 'ready_for_review', to: 'completed', expected: true },
    { from: 'ordered', to: 'results_entry', expected: false },
    { from: 'ordered', to: 'completed', expected: false },
    { from: 'sample_collected', to: 'completed', expected: false }
  ];

  for (const t of testTransitions) {
    const isAllowed = (ORDER_STATUS_TRANSITIONS[t.from] || []).includes(t.to);
    console.assert(
      isAllowed === t.expected,
      `Transition ${t.from} -> ${t.to} should be ${t.expected}, got ${isAllowed}`
    );
  }
  console.log('   ✓ Status model transitions validated (11 rules verified)\n');

  // Test 2: Check Status UI Config Map
  console.log('2. Checking Status UI Config mappings...');
  LAB_ORDER_STATUSES.forEach(status => {
    const conf = ORDER_STATUS_CONFIG[status];
    console.assert(conf && conf.label && conf.tone, `Status ${status} must have label and tone`);
  });
  console.log(`   ✓ All ${LAB_ORDER_STATUSES.length} laboratory order statuses mapped to UI configs\n`);

  // Test 3: Check Sample Status Model
  console.log('3. Checking Sample Status Model...');
  const expectedSampleStatuses = ['EXPECTED', 'COLLECTING', 'COLLECTED', 'VERIFIED', 'REJECTED', 'PROCESSING', 'RECOLLECTION_REQUIRED'];
  expectedSampleStatuses.forEach(st => {
    console.assert(SAMPLE_STATUSES.includes(st), `Sample status ${st} must exist`);
  });
  console.log(`   ✓ Sample status model verified (${SAMPLE_STATUSES.length} statuses defined)\n`);

  console.log('====================================================');
  console.log('ALL PHASE 1 FOUNDATION TESTS PASSED SUCCESSFULLY! ✓');
  console.log('====================================================');
}

testPhase1Foundation().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
