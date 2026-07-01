const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const DAY_NAME_SET = new Set(DAY_NAMES);

const parseTimeToMinutes = (time) => {
  if (typeof time !== 'string' || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
    throw new Error('Invalid time format. Expected HH:mm.');
  }

  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const minutesToTime = (minutes) => {
  const normalized = Number(minutes);

  if (!Number.isFinite(normalized) || normalized < 0) {
    throw new Error('Minutes must be a non-negative number.');
  }

  const hours = Math.floor(normalized / 60)
    .toString()
    .padStart(2, '0');
  const remainder = Math.floor(normalized % 60)
    .toString()
    .padStart(2, '0');

  return `${hours}:${remainder}`;
};

const calculateEndTime = (startTime, durationMinutes) =>
  minutesToTime(parseTimeToMinutes(startTime) + Number(durationMinutes));

const isTimeRangeOverlap = (startA, endA, startB, endB) =>
  parseTimeToMinutes(startA) < parseTimeToMinutes(endB) && parseTimeToMinutes(endA) > parseTimeToMinutes(startB);

const normalizeDayOfWeek = (value) => {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6) {
    return DAY_NAMES[value];
  }

  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();

    if (/^\d$/.test(lowered)) {
      const numeric = Number(lowered);
      return numeric >= 0 && numeric <= 6 ? DAY_NAMES[numeric] : null;
    }

    return DAY_NAME_SET.has(lowered) ? lowered : null;
  }

  return null;
};

const normalizeDate = (value) => {
  const input = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(input.getTime())) {
    throw new Error('Invalid appointment date.');
  }

  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
};

const formatDate = (value) => normalizeDate(value).toISOString().slice(0, 10);

const formatCompactDate = (value) => formatDate(value).replaceAll('-', '');

const getDayNameFromDate = (value) => DAY_NAMES[normalizeDate(value).getUTCDay()];

const getDayAvailability = (availability = [], date, clinicId = null) => {
  const dayName = getDayNameFromDate(date);

  return (
    availability.find((item) => {
      const isDay =
        normalizeDayOfWeek(item.dayOfWeek) === dayName &&
        item.isAvailable !== false &&
        item.isActive !== false;
      if (!isDay) return false;
      if (clinicId && item.clinicId) {
        return String(item.clinicId) === String(clinicId);
      }
      return true;
    }) || null
  );
};

const generateSlots = ({
  availability = [],
  existingAppointments = [],
  blockedSlots = [],
  date,
  durationMinutes,
  clinicId = null
}) => {
  const dayAvailability = getDayAvailability(availability, date, clinicId);

  if (!dayAvailability || !dayAvailability.startTime || !dayAvailability.endTime) {
    return [];
  }

  const slotDuration = Number(dayAvailability.slotDurationMinutes) === 15 ? 15 : 20;
  const dayStart = parseTimeToMinutes(dayAvailability.startTime);
  const dayEnd = parseTimeToMinutes(dayAvailability.endTime);
  const targetDate = formatDate(date);
  const activeBlockedSlots = blockedSlots.filter((item) => formatDate(item.date) === targetDate);
  const slots = [];

  for (let currentStart = dayStart; currentStart + slotDuration <= dayEnd; currentStart += slotDuration) {
    const startTime = minutesToTime(currentStart);
    const endTime = minutesToTime(currentStart + slotDuration);
    const conflictingAppointment = existingAppointments.find((item) => isTimeRangeOverlap(startTime, endTime, item.startTime, item.endTime));
    const blockedSlot = activeBlockedSlots.find((item) => isTimeRangeOverlap(startTime, endTime, item.startTime, item.endTime));

    slots.push({
      startTime,
      endTime,
      available: !conflictingAppointment && !blockedSlot,
      reason: conflictingAppointment ? 'Booked' : blockedSlot ? blockedSlot.reason || 'Blocked' : null
    });
  }

  return slots;
};

module.exports = {
  DAY_NAMES,
  parseTimeToMinutes,
  minutesToTime,
  calculateEndTime,
  isTimeRangeOverlap,
  normalizeDayOfWeek,
  normalizeDate,
  formatDate,
  formatCompactDate,
  getDayNameFromDate,
  getDayAvailability,
  generateSlots
};
