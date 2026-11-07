import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  calculateKpiComparison, 
  calculateBillingKpiComparison,
  checkHistoricalDataAvailability,
  getPreviousDayStr,
  getTodayStr,
  getThisMonthRange,
  getPreviousMonthRange,
  getThisYearRange,
  getPreviousYearRange,
  formatDisplayDate,
  formatDisplayRange,
  resolveDateRange,
  validateCustomDateRange,
  DATE_RANGE_OPTIONS
} from '../utils/kpiComparison.js';

describe('Appointment KPI Comparison & Advanced Date Range Logic', () => {
  it('Rule 1: Hides comparison when both current and previous are 0', () => {
    const result = calculateKpiComparison(0, 0, true);
    assert.equal(result.shouldDisplay, false);
    assert.equal(result.text, '');
    assert.equal(result.type, 'none');
  });

  it('Rule 2: Shows 100% decrease in red with custom period label', () => {
    const result1 = calculateKpiComparison(0, 5, true, 'yesterday');
    assert.equal(result1.shouldDisplay, true);
    assert.equal(result1.text, '↓ 100% vs yesterday');
    assert.equal(result1.colorClass, 'text-rose-600');
    assert.equal(result1.type, 'decrease');

    const result2 = calculateKpiComparison(0, 8, true, 'last month');
    assert.equal(result2.shouldDisplay, true);
    assert.equal(result2.text, '↓ 100% vs last month');
    assert.equal(result2.colorClass, 'text-rose-600');
  });

  it('Rule 3: Shows "New activity" in green when current > 0 and previous is 0', () => {
    const result1 = calculateKpiComparison(3, 0, true, 'last year');
    assert.equal(result1.shouldDisplay, true);
    assert.equal(result1.text, 'New activity');
    assert.equal(result1.colorClass, 'text-emerald-600');
    assert.equal(result1.type, 'new');
  });

  it('Rule 4: Calculates actual percentage increase and decrease with period labels', () => {
    // 10 vs 8 -> +25%
    const res1 = calculateKpiComparison(10, 8, true, 'yesterday');
    assert.equal(res1.shouldDisplay, true);
    assert.equal(res1.text, '↑ 25% vs yesterday');
    assert.equal(res1.colorClass, 'text-emerald-600');
    assert.equal(res1.type, 'increase');

    // 5 vs 10 -> -50%
    const res2 = calculateKpiComparison(5, 10, true, 'last month');
    assert.equal(res2.shouldDisplay, true);
    assert.equal(res2.text, '↓ 50% vs last month');
    assert.equal(res2.colorClass, 'text-rose-600');
    assert.equal(res2.type, 'decrease');

    // 5 vs 5 -> No change
    const res3 = calculateKpiComparison(5, 5, true, 'last year');
    assert.equal(res3.shouldDisplay, true);
    assert.equal(res3.text, 'No change');
    assert.equal(res3.colorClass, 'text-slate-400');
    assert.equal(res3.type, 'neutral');
  });

  it('Data validation: Hides comparison when data is not valid or still loading', () => {
    assert.equal(calculateKpiComparison(5, 2, false).shouldDisplay, false);
    assert.equal(calculateKpiComparison(null, 2, true).shouldDisplay, false);
    assert.equal(calculateKpiComparison(2, null, true).shouldDisplay, false);
    assert.equal(calculateKpiComparison(undefined, undefined, true).shouldDisplay, false);
    assert.equal(calculateKpiComparison('abc', 5, true).shouldDisplay, false);
  });

  it('Date Range Resolution: Option 1 - Today', () => {
    const fixedDate = new Date(2026, 10, 6); // 2026-11-06
    const res = resolveDateRange(DATE_RANGE_OPTIONS.TODAY, {}, fixedDate);
    assert.equal(res.from, '2026-11-06');
    assert.equal(res.to, '2026-11-06');
    assert.equal(res.comparisonFrom, '2026-11-05');
    assert.equal(res.comparisonTo, '2026-11-05');
    assert.equal(res.comparisonLabel, 'yesterday');
    assert.equal(res.kpiTitle, "TODAY'S APPOINTMENTS");
    assert.equal(res.kpiBadge, "Today's");
    assert.equal(res.displayDate, 'Nov 06, 2026');
  });

  it('Date Range Resolution: Option 2 - Yesterday', () => {
    const fixedDate = new Date(2026, 10, 6); // 2026-11-06
    const res = resolveDateRange(DATE_RANGE_OPTIONS.YESTERDAY, {}, fixedDate);
    assert.equal(res.from, '2026-11-05');
    assert.equal(res.to, '2026-11-05');
    assert.equal(res.comparisonFrom, '2026-11-04');
    assert.equal(res.comparisonTo, '2026-11-04');
    assert.equal(res.comparisonLabel, 'day before yesterday');
    assert.equal(res.kpiTitle, "YESTERDAY'S APPOINTMENTS");
    assert.equal(res.kpiBadge, "Yesterday's");
    assert.equal(res.displayDate, 'Nov 05, 2026');
  });

  it('Date Range Resolution: Option 3 - This Month', () => {
    const fixedDate = new Date(2026, 10, 6); // 2026-11-06 (Nov has 30 days)
    const res = resolveDateRange(DATE_RANGE_OPTIONS.THIS_MONTH, {}, fixedDate);
    assert.equal(res.from, '2026-11-01');
    assert.equal(res.to, '2026-11-30');
    assert.equal(res.comparisonFrom, '2026-10-01');
    assert.equal(res.comparisonTo, '2026-10-31');
    assert.equal(res.comparisonLabel, 'last month');
    assert.equal(res.kpiTitle, "THIS MONTH'S APPOINTMENTS");
    assert.equal(res.kpiBadge, "This Month");
    assert.equal(res.displayDate, 'Nov 01, 2026 – Nov 30, 2026');
  });

  it('Date Range Resolution: Option 4 - This Year', () => {
    const fixedDate = new Date(2026, 10, 6);
    const res = resolveDateRange(DATE_RANGE_OPTIONS.THIS_YEAR, {}, fixedDate);
    assert.equal(res.from, '2026-01-01');
    assert.equal(res.to, '2026-12-31');
    assert.equal(res.comparisonFrom, '2025-01-01');
    assert.equal(res.comparisonTo, '2025-12-31');
    assert.equal(res.comparisonLabel, 'last year');
    assert.equal(res.kpiTitle, "THIS YEAR'S APPOINTMENTS");
    assert.equal(res.kpiBadge, "This Year");
    assert.equal(res.displayDate, 'Jan 01, 2026 – Dec 31, 2026');
  });

  it('Date Range Resolution: Option 5 - Custom Range', () => {
    const res = resolveDateRange(DATE_RANGE_OPTIONS.CUSTOM, { from: '2026-11-01', to: '2026-11-06' });
    assert.equal(res.from, '2026-11-01');
    assert.equal(res.to, '2026-11-06');
    assert.equal(res.comparisonFrom, null);
    assert.equal(res.comparisonTo, null);
    assert.equal(res.kpiTitle, "SELECTED PERIOD APPOINTMENTS");
    assert.equal(res.kpiBadge, "Custom");
    assert.equal(res.displayDate, 'Nov 01, 2026 – Nov 06, 2026');
  });

  it('Custom Range Validation: validates from/to presence, format, ordering and future dates', () => {
    assert.equal(validateCustomDateRange('', '').isValid, false);
    assert.equal(validateCustomDateRange('2026-11-06', '').isValid, false);
    assert.equal(validateCustomDateRange('2026-11-10', '2026-11-05').isValid, false);
    assert.equal(validateCustomDateRange('2026-11-10', '2026-11-05').error, 'From Date cannot be later than To Date.');
    assert.equal(validateCustomDateRange('2026-11-01', '2026-11-10', '2026-11-06').isValid, false);
    assert.equal(validateCustomDateRange('2026-11-01', '2026-11-06', '2026-11-06').isValid, true);
  });

  describe('Billing 10-Day Historical Data Validation & Comparison Rules', () => {
    it('checkHistoricalDataAvailability: returns true only when history is >= 10 days', () => {
      const now = new Date('2026-11-06T12:00:00Z');
      assert.equal(checkHistoricalDataAvailability('2026-11-02', now), false); // 4 days
      assert.equal(checkHistoricalDataAvailability('2026-10-30', now), false); // 7 days
      assert.equal(checkHistoricalDataAvailability('2026-10-27', now), true);  // 10 days
      assert.equal(checkHistoricalDataAvailability('2026-09-01', now), true);  // 66 days
      assert.equal(checkHistoricalDataAvailability(null, now), false);
    });

    it('suppresses red decrease indicators when historical data is under 10 days', () => {
      // 5 today, 10 yesterday -> -50% decrease, but hasSufficientHistory = false
      const res = calculateBillingKpiComparison(5, 10, true, 'yesterday', false);
      assert.equal(res.shouldDisplay, false);

      // 0 today, 5 yesterday -> -100% decrease, but hasSufficientHistory = false
      const resZero = calculateBillingKpiComparison(0, 5, true, 'yesterday', false);
      assert.equal(resZero.shouldDisplay, false);
    });

    it('shows red decrease when historical data is >= 10 days', () => {
      const res = calculateBillingKpiComparison(5, 10, true, 'yesterday', true);
      assert.equal(res.shouldDisplay, true);
      assert.equal(res.text, '↓ 50% vs yesterday');
      assert.equal(res.colorClass, 'text-rose-600');
    });

    it('shows "New activity" in green when previous was 0 and current > 0', () => {
      const res = calculateBillingKpiComparison(5, 0, true, 'yesterday', false);
      assert.equal(res.shouldDisplay, true);
      assert.equal(res.text, 'New activity');
      assert.equal(res.colorClass, 'text-emerald-600');
    });

    it('shows actual increase in green when current > previous', () => {
      const res = calculateBillingKpiComparison(12, 10, true, 'last month', true);
      assert.equal(res.shouldDisplay, true);
      assert.equal(res.text, '↑ 20% vs last month');
      assert.equal(res.colorClass, 'text-emerald-600');
    });

    it('hides comparison when both current and previous are 0', () => {
      const res = calculateBillingKpiComparison(0, 0, true, 'yesterday', true);
      assert.equal(res.shouldDisplay, false);
    });
  });
});
