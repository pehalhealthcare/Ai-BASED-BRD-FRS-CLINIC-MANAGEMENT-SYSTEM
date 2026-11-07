/**
 * Calculates comparison metrics between a current period count and a previous period count for a KPI card.
 * 
 * Rules:
 * 1. Both current and previous are 0 -> Hide comparison (shouldDisplay: false)
 * 2. Current is 0, previous > 0 -> Show 100% decrease (↓ 100% vs [periodLabel], text-rose-600)
 * 3. Current > 0, previous is 0 -> Show New activity (New activity, text-emerald-600)
 * 4. Current > 0, previous > 0:
 *    - diff > 0 -> Positive increase (↑ X% vs [periodLabel], text-emerald-600)
 *    - diff < 0 -> Negative decrease (↓ X% vs [periodLabel], text-rose-600)
 *    - diff === 0 -> Neutral (No change, text-slate-400)
 * 
 * Minimum data validation:
 * Only display comparison when both datasets are successfully loaded and valid.
 *
 * @param {number} currentCount
 * @param {number} previousCount
 * @param {boolean} isValid - Whether both datasets are loaded and valid
 * @param {string} periodLabel - Comparison period description (e.g. 'yesterday', 'day before yesterday', 'last month', 'last year')
 * @returns {{ shouldDisplay: boolean, text: string, colorClass: string, type: 'increase' | 'decrease' | 'neutral' | 'new' | 'none' }}
 */
/**
 * Checks whether a clinic has at least 10 days of usable historical data.
 * 
 * @param {string|Date|null} oldestDateStr
 * @param {Date} [currentDate]
 * @returns {boolean}
 */
export const checkHistoricalDataAvailability = (oldestDateStr, currentDate = new Date()) => {
  if (!oldestDateStr) return false;
  const oldestDate = new Date(oldestDateStr);
  if (isNaN(oldestDate.getTime())) return false;
  const diffMs = currentDate.getTime() - oldestDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays >= 10;
};

/**
 * Calculates billing KPI comparisons with strict enforcement of the 10-day historical data availability rule.
 * 
 * Rules:
 * - If clinic has fewer than 10 days of usable historical data, suppress red percentage indicators.
 * - If previous period is unavailable or isValid is false, hide comparison (shouldDisplay: false).
 * - If both periods have zero records, hide comparison (shouldDisplay: false).
 * - If previous period is 0 and current > 0, show "New activity" (green).
 * - Show red only for actual decrease (only when sufficient historical data >= 10 days).
 * - Show green only for actual increase.
 * - Show neutral grey for no change.
 * 
 * @param {number} currentCount
 * @param {number} previousCount
 * @param {boolean} isValid
 * @param {string} periodLabel
 * @param {boolean} hasSufficientHistory
 * @returns {{ shouldDisplay: boolean, text: string, colorClass: string, type: 'increase' | 'decrease' | 'neutral' | 'new' | 'none' }}
 */
export const calculateBillingKpiComparison = (
  currentCount, 
  previousCount, 
  isValid = true, 
  periodLabel = 'yesterday',
  hasSufficientHistory = true
) => {
  if (!isValid || currentCount === undefined || currentCount === null || previousCount === undefined || previousCount === null) {
    return { shouldDisplay: false, text: '', colorClass: '', type: 'none' };
  }

  const current = Number(currentCount);
  const previous = Number(previousCount);

  if (isNaN(current) || isNaN(previous) || current < 0 || previous < 0) {
    return { shouldDisplay: false, text: '', colorClass: '', type: 'none' };
  }

  // Rule: If both periods have zero records, hide comparison
  if (current === 0 && previous === 0) {
    return { shouldDisplay: false, text: '', colorClass: '', type: 'none' };
  }

  // Rule: If previous is 0 and current > 0 -> New activity
  if (current > 0 && previous === 0) {
    return {
      shouldDisplay: true,
      text: 'New activity',
      colorClass: 'text-emerald-600',
      type: 'new'
    };
  }

  // Rule: If previous > 0 and current === 0 -> 100% decrease
  if (current === 0 && previous > 0) {
    // If fewer than 10 days of historical data, do NOT show red decrease indicator!
    if (!hasSufficientHistory) {
      return { shouldDisplay: false, text: '', colorClass: '', type: 'none' };
    }
    return {
      shouldDisplay: true,
      text: `↓ 100% vs ${periodLabel}`,
      colorClass: 'text-rose-600',
      type: 'decrease'
    };
  }

  // Rule: Both > 0 -> percentage difference
  const diff = current - previous;
  if (diff === 0) {
    return {
      shouldDisplay: true,
      text: 'No change',
      colorClass: 'text-slate-400',
      type: 'neutral'
    };
  }

  const pct = Math.abs(Math.round(((current - previous) / previous) * 100));
  const isUp = diff > 0;

  // If decrease and clinic lacks 10-day history, suppress red decrease
  if (!isUp && !hasSufficientHistory) {
    return { shouldDisplay: false, text: '', colorClass: '', type: 'none' };
  }

  return {
    shouldDisplay: true,
    text: `${isUp ? '↑' : '↓'} ${pct}% vs ${periodLabel}`,
    colorClass: isUp ? 'text-emerald-600' : 'text-rose-600',
    type: isUp ? 'increase' : 'decrease'
  };
};

export const calculateKpiComparison = (currentCount, previousCount, isValid = true, periodLabel = 'yesterday') => {
  if (
    !isValid ||
    currentCount === undefined ||
    currentCount === null ||
    previousCount === undefined ||
    previousCount === null
  ) {
    return { shouldDisplay: false, text: '', colorClass: '', type: 'none' };
  }

  const current = Number(currentCount);
  const previous = Number(previousCount);

  if (isNaN(current) || isNaN(previous) || current < 0 || previous < 0) {
    return { shouldDisplay: false, text: '', colorClass: '', type: 'none' };
  }

  // Rule 1: 0 current and 0 previous -> hide comparison
  if (current === 0 && previous === 0) {
    return { shouldDisplay: false, text: '', colorClass: '', type: 'none' };
  }

  // Rule 2: 0 current and > 0 previous -> 100% decrease
  if (current === 0 && previous > 0) {
    return {
      shouldDisplay: true,
      text: `↓ 100% vs ${periodLabel}`,
      colorClass: 'text-rose-600',
      type: 'decrease'
    };
  }

  // Rule 3: > 0 current and 0 previous -> New activity
  if (current > 0 && previous === 0) {
    return {
      shouldDisplay: true,
      text: 'New activity',
      colorClass: 'text-emerald-600',
      type: 'new'
    };
  }

  // Rule 4: > 0 current and > 0 previous -> calculate actual percentage change
  const diff = current - previous;
  if (diff === 0) {
    return {
      shouldDisplay: true,
      text: 'No change',
      colorClass: 'text-slate-400',
      type: 'neutral'
    };
  }

  const pct = Math.abs(Math.round(((current - previous) / previous) * 100));
  const isUp = diff > 0;

  return {
    shouldDisplay: true,
    text: `${isUp ? '↑' : '↓'} ${pct}% vs ${periodLabel}`,
    colorClass: isUp ? 'text-emerald-600' : 'text-rose-600',
    type: isUp ? 'increase' : 'decrease'
  };
};

/**
 * Returns a formatted date string YYYY-MM-DD from a Date object safely.
 * 
 * @param {Date} d
 * @returns {string}
 */
export const formatDateStr = (d = new Date()) => {
  const dateObj = d instanceof Date ? d : new Date(d);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Returns today's date string YYYY-MM-DD.
 * 
 * @param {Date} [d]
 * @returns {string}
 */
export const getTodayStr = (d = new Date()) => formatDateStr(d);

/**
 * Returns previous calendar day string YYYY-MM-DD safely given a YYYY-MM-DD input.
 * Avoids any timezone shift by using noon local time.
 * 
 * @param {string} dateStr
 * @returns {string}
 */
export const getPreviousDayStr = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  const [year, month, day] = parts.map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return '';
  const d = new Date(year, month - 1, day, 12, 0, 0);
  d.setDate(d.getDate() - 1);
  return formatDateStr(d);
};

/**
 * Returns first and last calendar dates of the month for baseDate.
 * 
 * @param {Date|string} [baseDate]
 * @returns {{ from: string, to: string }}
 */
export const getThisMonthRange = (baseDate = new Date()) => {
  const d = baseDate instanceof Date ? baseDate : new Date(baseDate);
  const year = d.getFullYear();
  const month = d.getMonth();
  const firstDay = new Date(year, month, 1, 12, 0, 0);
  const lastDay = new Date(year, month + 1, 0, 12, 0, 0);
  return {
    from: formatDateStr(firstDay),
    to: formatDateStr(lastDay)
  };
};

/**
 * Returns first and last calendar dates of the previous month relative to baseDate.
 * 
 * @param {Date|string} [baseDate]
 * @returns {{ from: string, to: string }}
 */
export const getPreviousMonthRange = (baseDate = new Date()) => {
  const d = baseDate instanceof Date ? baseDate : new Date(baseDate);
  const year = d.getFullYear();
  const month = d.getMonth();
  const firstDay = new Date(year, month - 1, 1, 12, 0, 0);
  const lastDay = new Date(year, month, 0, 12, 0, 0);
  return {
    from: formatDateStr(firstDay),
    to: formatDateStr(lastDay)
  };
};

/**
 * Returns first and last calendar dates of the year for baseDate.
 * 
 * @param {Date|string} [baseDate]
 * @returns {{ from: string, to: string }}
 */
export const getThisYearRange = (baseDate = new Date()) => {
  const d = baseDate instanceof Date ? baseDate : new Date(baseDate);
  const year = d.getFullYear();
  return {
    from: `${year}-01-01`,
    to: `${year}-12-31`
  };
};

/**
 * Returns first and last calendar dates of the previous year relative to baseDate.
 * 
 * @param {Date|string} [baseDate]
 * @returns {{ from: string, to: string }}
 */
export const getPreviousYearRange = (baseDate = new Date()) => {
  const d = baseDate instanceof Date ? baseDate : new Date(baseDate);
  const year = d.getFullYear();
  return {
    from: `${year - 1}-01-01`,
    to: `${year - 1}-12-31`
  };
};

/**
 * Formats a YYYY-MM-DD date into "MMM DD, YYYY" (e.g. "Nov 06, 2026").
 * 
 * @param {string} dateStr
 * @returns {string}
 */
export const formatDisplayDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const dateObj = new Date(y, m - 1, d, 12, 0, 0);
  return dateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
};

/**
 * Formats a range of dates into readable display (e.g. "Nov 06, 2026" or "Nov 01, 2026 – Nov 30, 2026").
 * 
 * @param {string} fromStr
 * @param {string} toStr
 * @returns {string}
 */
export const formatDisplayRange = (fromStr, toStr) => {
  if (!fromStr && !toStr) return '';
  if (!toStr || fromStr === toStr) return formatDisplayDate(fromStr);
  return `${formatDisplayDate(fromStr)} – ${formatDisplayDate(toStr)}`;
};

export const DATE_RANGE_OPTIONS = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  THIS_MONTH: 'this_month',
  THIS_YEAR: 'this_year',
  CUSTOM: 'custom'
};

/**
 * Resolves full date boundaries and comparison parameters for a selected date range option.
 * 
 * @param {string} option - One of 'today', 'yesterday', 'this_month', 'this_year', 'custom'
 * @param {{ from?: string, to?: string }} [customRange]
 * @param {Date} [baseDate]
 * @returns {{
 *   option: string,
 *   from: string,
 *   to: string,
 *   comparisonFrom: string|null,
 *   comparisonTo: string|null,
 *   comparisonLabel: string,
 *   kpiTitle: string,
 *   kpiBadge: string,
 *   displayDate: string
 * }}
 */
export const resolveDateRange = (option = DATE_RANGE_OPTIONS.TODAY, customRange = {}, baseDate = new Date()) => {
  const today = getTodayStr(baseDate);

  switch (option) {
    case DATE_RANGE_OPTIONS.YESTERDAY: {
      const yesterday = getPreviousDayStr(today);
      const dayBeforeYesterday = getPreviousDayStr(yesterday);
      return {
        option,
        from: yesterday,
        to: yesterday,
        comparisonFrom: dayBeforeYesterday,
        comparisonTo: dayBeforeYesterday,
        comparisonLabel: 'day before yesterday',
        kpiTitle: "YESTERDAY'S APPOINTMENTS",
        kpiBadge: "Yesterday's",
        displayDate: formatDisplayDate(yesterday)
      };
    }

    case DATE_RANGE_OPTIONS.THIS_MONTH: {
      const { from, to } = getThisMonthRange(baseDate);
      const prevMonth = getPreviousMonthRange(baseDate);
      return {
        option,
        from,
        to,
        comparisonFrom: prevMonth.from,
        comparisonTo: prevMonth.to,
        comparisonLabel: 'last month',
        kpiTitle: "THIS MONTH'S APPOINTMENTS",
        kpiBadge: "This Month",
        displayDate: formatDisplayRange(from, to)
      };
    }

    case DATE_RANGE_OPTIONS.THIS_YEAR: {
      const { from, to } = getThisYearRange(baseDate);
      const prevYear = getPreviousYearRange(baseDate);
      return {
        option,
        from,
        to,
        comparisonFrom: prevYear.from,
        comparisonTo: prevYear.to,
        comparisonLabel: 'last year',
        kpiTitle: "THIS YEAR'S APPOINTMENTS",
        kpiBadge: "This Year",
        displayDate: formatDisplayRange(from, to)
      };
    }

    case DATE_RANGE_OPTIONS.CUSTOM: {
      const from = customRange.from || today;
      const to = customRange.to || today;
      return {
        option,
        from,
        to,
        comparisonFrom: null,
        comparisonTo: null,
        comparisonLabel: '',
        kpiTitle: "SELECTED PERIOD APPOINTMENTS",
        kpiBadge: "Custom",
        displayDate: formatDisplayRange(from, to)
      };
    }

    case DATE_RANGE_OPTIONS.TODAY:
    default: {
      const yesterday = getPreviousDayStr(today);
      return {
        option: DATE_RANGE_OPTIONS.TODAY,
        from: today,
        to: today,
        comparisonFrom: yesterday,
        comparisonTo: yesterday,
        comparisonLabel: 'yesterday',
        kpiTitle: "TODAY'S APPOINTMENTS",
        kpiBadge: "Today's",
        displayDate: formatDisplayDate(today)
      };
    }
  }
};

/**
 * Validates a custom date range.
 * 
 * @param {string} from
 * @param {string} to
 * @param {string} [maxDate]
 * @returns {{ isValid: boolean, error?: string }}
 */
export const validateCustomDateRange = (from, to, maxDate = null) => {
  if (!from || !to) {
    return { isValid: false, error: 'Both From and To dates are required.' };
  }
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(from) || !dateRegex.test(to)) {
    return { isValid: false, error: 'Please enter valid dates in YYYY-MM-DD format.' };
  }
  if (from > to) {
    return { isValid: false, error: 'From Date cannot be later than To Date.' };
  }
  if (maxDate && (from > maxDate || to > maxDate)) {
    return { isValid: false, error: `Dates cannot be in the future (after ${maxDate}).` };
  }
  return { isValid: true };
};
