const { 
  LAB_ORDER_STATUS, 
  LAB_ORDER_STATUSES, 
  SAMPLE_STATUS, 
  SAMPLE_STATUSES, 
  ORDER_STATUS_TRANSITIONS 
} = require('../src/modules/labs/labStatus.constants');

console.log('--- TEST 1: Status Models & Constants ---');
console.assert(Array.isArray(LAB_ORDER_STATUSES) && LAB_ORDER_STATUSES.length >= 15, 'LAB_ORDER_STATUSES must be array with all statuses');
console.assert(LAB_ORDER_STATUSES.includes('checked_in'), 'Must include checked_in');
console.assert(LAB_ORDER_STATUSES.includes('called'), 'Must include called');
console.assert(LAB_ORDER_STATUSES.includes('collecting'), 'Must include collecting');
console.assert(LAB_ORDER_STATUSES.includes('sample_collected'), 'Must include sample_collected');
console.assert(LAB_ORDER_STATUSES.includes('recollection_required'), 'Must include recollection_required');
console.log('✓ Status constants validated');

console.log('--- TEST 2: Valid & Invalid Status Transitions ---');
console.assert(ORDER_STATUS_TRANSITIONS['ordered'].includes('checked_in'), 'ordered -> checked_in allowed');
console.assert(ORDER_STATUS_TRANSITIONS['checked_in'].includes('called'), 'checked_in -> called allowed');
console.assert(ORDER_STATUS_TRANSITIONS['called'].includes('collecting'), 'called -> collecting allowed');
console.assert(ORDER_STATUS_TRANSITIONS['collecting'].includes('sample_collected'), 'collecting -> sample_collected allowed');
console.assert(ORDER_STATUS_TRANSITIONS['sample_collected'].includes('processing'), 'sample_collected -> processing allowed');
console.assert(ORDER_STATUS_TRANSITIONS['processing'].includes('results_entry'), 'processing -> results_entry allowed');
console.assert(ORDER_STATUS_TRANSITIONS['results_entry'].includes('ready_for_review'), 'results_entry -> ready_for_review allowed');
console.assert(ORDER_STATUS_TRANSITIONS['ready_for_review'].includes('completed'), 'ready_for_review -> completed allowed');
console.assert(ORDER_STATUS_TRANSITIONS['recollection_required'].includes('scheduled'), 'recollection_required -> scheduled allowed');

// Invalid direct jumps
console.assert(!ORDER_STATUS_TRANSITIONS['ordered'].includes('results_entry'), 'ordered -> results_entry FORBIDDEN');
console.assert(!ORDER_STATUS_TRANSITIONS['ordered'].includes('completed'), 'ordered -> completed FORBIDDEN');
console.assert(!ORDER_STATUS_TRANSITIONS['sample_collected'].includes('completed'), 'sample_collected -> completed FORBIDDEN');
console.log('✓ Transition rules validated');

console.log('--- TEST 3: Sample Statuses ---');
console.assert(SAMPLE_STATUSES.includes('EXPECTED'), 'SAMPLE_STATUSES must include EXPECTED');
console.assert(SAMPLE_STATUSES.includes('COLLECTING'), 'SAMPLE_STATUSES must include COLLECTING');
console.assert(SAMPLE_STATUSES.includes('COLLECTED'), 'SAMPLE_STATUSES must include COLLECTED');
console.assert(SAMPLE_STATUSES.includes('VERIFIED'), 'SAMPLE_STATUSES must include VERIFIED');
console.assert(SAMPLE_STATUSES.includes('REJECTED'), 'SAMPLE_STATUSES must include REJECTED');
console.assert(SAMPLE_STATUSES.includes('RECOLLECTION_REQUIRED'), 'SAMPLE_STATUSES must include RECOLLECTION_REQUIRED');
console.log('✓ Sample statuses validated');

console.log('All Phase 1 Foundation assertions PASSED!');
