const { HTTP_STATUS } = require('../constants/httpStatus');
const { AppError } = require('./AppError');

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const formatDateLabel = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
};

const parseDateInput = (value) => {
  if (!value || !DATE_ONLY_PATTERN.test(String(value))) {
    throw new AppError('Invalid analytics date format. Use YYYY-MM-DD.', HTTP_STATUS.BAD_REQUEST);
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new AppError('Invalid analytics date value.', HTTP_STATUS.BAD_REQUEST);
  }

  return date;
};

const startOfUtcDay = (value) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const endOfUtcDay = (value) => {
  const date = value instanceof Date ? new Date(value) : new Date(value);
  date.setUTCHours(23, 59, 59, 999);
  return date;
};

const resolveAnalyticsDateRange = ({
  from,
  to,
  defaultDays = 30,
  maxRangeDays = 365,
  now = new Date()
} = {}) => {
  const today = endOfUtcDay(now);
  let toDate = to ? endOfUtcDay(parseDateInput(to)) : today;
  let fromDate = from ? startOfUtcDay(parseDateInput(from)) : startOfUtcDay(new Date(toDate));

  if (!from) {
    fromDate.setUTCDate(fromDate.getUTCDate() - (defaultDays - 1));
  }

  if (fromDate > toDate) {
    throw new AppError('"from" date cannot be after "to" date.', HTTP_STATUS.BAD_REQUEST);
  }

  const rangeInDays = Math.floor((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;

  if (rangeInDays > maxRangeDays) {
    throw new AppError(`Analytics date range cannot exceed ${maxRangeDays} days.`, HTTP_STATUS.BAD_REQUEST);
  }

  return {
    fromDate,
    toDate,
    from: formatDateLabel(fromDate),
    to: formatDateLabel(toDate),
    rangeInDays
  };
};

module.exports = {
  DATE_ONLY_PATTERN,
  formatDateLabel,
  parseDateInput,
  startOfUtcDay,
  endOfUtcDay,
  resolveAnalyticsDateRange
};
