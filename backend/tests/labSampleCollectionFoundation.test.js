const { 
  LAB_ORDER_STATUS, 
  LAB_ORDER_STATUSES, 
  SAMPLE_STATUS, 
  SAMPLE_STATUSES, 
  ORDER_STATUS_TRANSITIONS 
} = require('../src/modules/labs/labStatus.constants');

describe('Lab Sample Collection Foundation', () => {
  it('validates status models and constants', () => {
    expect(Array.isArray(LAB_ORDER_STATUSES) && LAB_ORDER_STATUSES.length >= 15).toBe(true);
    expect(LAB_ORDER_STATUSES).toContain('checked_in');
    expect(LAB_ORDER_STATUSES).toContain('called');
    expect(LAB_ORDER_STATUSES).toContain('collecting');
    expect(LAB_ORDER_STATUSES).toContain('sample_collected');
    expect(LAB_ORDER_STATUSES).toContain('recollection_required');
  });

  it('validates status transitions', () => {
    expect(ORDER_STATUS_TRANSITIONS['ordered']).toContain('checked_in');
    expect(ORDER_STATUS_TRANSITIONS['checked_in']).toContain('called');
    expect(ORDER_STATUS_TRANSITIONS['called']).toContain('collecting');
    expect(ORDER_STATUS_TRANSITIONS['collecting']).toContain('sample_collected');
    expect(ORDER_STATUS_TRANSITIONS['sample_collected']).toContain('processing');
    expect(ORDER_STATUS_TRANSITIONS['processing']).toContain('results_entry');
    expect(ORDER_STATUS_TRANSITIONS['results_entry']).toContain('ready_for_review');
    expect(ORDER_STATUS_TRANSITIONS['ready_for_review']).toContain('completed');
    expect(ORDER_STATUS_TRANSITIONS['recollection_required']).toContain('scheduled');

    // Invalid direct jumps
    expect(ORDER_STATUS_TRANSITIONS['ordered']).not.toContain('results_entry');
    expect(ORDER_STATUS_TRANSITIONS['ordered']).not.toContain('completed');
    expect(ORDER_STATUS_TRANSITIONS['sample_collected']).not.toContain('completed');
  });

  it('validates sample statuses', () => {
    expect(SAMPLE_STATUSES).toContain('EXPECTED');
    expect(SAMPLE_STATUSES).toContain('COLLECTING');
    expect(SAMPLE_STATUSES).toContain('COLLECTED');
    expect(SAMPLE_STATUSES).toContain('VERIFIED');
    expect(SAMPLE_STATUSES).toContain('REJECTED');
    expect(SAMPLE_STATUSES).toContain('RECOLLECTION_REQUIRED');
  });
});
