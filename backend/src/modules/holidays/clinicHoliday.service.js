// Clinic Holiday Service
const ClinicHoliday = require('./clinicHoliday.model');

/**
 * Create a new holiday entry for a clinic.
 */
const createHoliday = async ({ clinicId, holiday_name, holiday_date, is_recurring = false, all_clinics = false, allow_emergency = false, closed_portions = ['all'] }) => {
  const holiday = new ClinicHoliday({
    clinicId,
    holiday_name,
    holiday_date,
    is_recurring,
    all_clinics,
    allow_emergency,
    closed_portions,
    is_deleted: false
  });
  return await holiday.save();
};

/**
 * List holidays for a clinic. Can include deleted entries if requested.
 */
const listHolidays = async ({ clinicId, includeDeleted = false }) => {
  const filter = {
    $or: [
      { clinicId },
      { all_clinics: true }
    ]
  };
  if (!includeDeleted) filter.is_deleted = false;
  return await ClinicHoliday.find(filter).sort({ holiday_date: 1 }).lean();
};

/**
 * Update an existing holiday.
 */
const updateHoliday = async (id, updates) => {
  const allowed = ['holiday_name', 'holiday_date', 'is_recurring', 'closed_portions', 'is_deleted', 'all_clinics', 'allow_emergency'];
  const data = {};
  allowed.forEach((field) => {
    if (updates[field] !== undefined) data[field] = updates[field];
  });
  return await ClinicHoliday.findByIdAndUpdate(id, data, { new: true }).lean();
};

/**
 * Soft‑delete a holiday (mark as deleted).
 */
const softDeleteHoliday = async (id) => {
  return await ClinicHoliday.findByIdAndUpdate(id, { is_deleted: true }, { new: true }).lean();
};

/**
 * Permanent delete a holiday.
 */
const permanentDeleteHoliday = async (id) => {
  return await ClinicHoliday.findByIdAndDelete(id).lean();
};

/**
 * Check if a clinic is closed on a given date.
 * Considers exact date matches and recurring holidays (same month & day each year).
 * Also matches holidays with all_clinics: true.
 * Optionally checks for specific portions: 'appointments', 'doctor_slots', 'labs', 'pharmacy'.
 * Allows bypassing closure if appointmentType is 'emergency' and holiday has allow_emergency: true.
 */
const isClosedOnDate = async (clinicId, date, portion = null, appointmentType = null) => {
  const normalized = new Date(date);
  // Normalize to UTC midnight/start of day if needed
  normalized.setUTCHours(0, 0, 0, 0);

  // Helper query builder for portion matches
  const getPortionFilter = (baseFilter) => {
    if (!portion) return baseFilter;
    return {
      ...baseFilter,
      $or: [
        { closed_portions: 'all' },
        { closed_portions: portion }
      ]
    };
  };

  // Exact match holidays (non‑recurring)
  const exactQuery = getPortionFilter({
    $or: [
      { clinicId },
      { all_clinics: true }
    ],
    holiday_date: {
      $gte: new Date(normalized.setUTCHours(0, 0, 0, 0)),
      $lt: new Date(normalized.setUTCHours(23, 59, 59, 999))
    },
    is_deleted: false,
    is_recurring: false
  });

  const exact = await ClinicHoliday.findOne(exactQuery);
  if (exact) {
    if (appointmentType === 'emergency' && exact.allow_emergency) {
      return false;
    }
    return true;
  }

  // Recurring holidays: match month & day regardless of year
  const month = normalized.getUTCMonth();
  const day = normalized.getUTCDate();

  const recurringQuery = getPortionFilter({
    $or: [
      { clinicId },
      { all_clinics: true }
    ],
    is_recurring: true,
    is_deleted: false,
    $expr: {
      $and: [
        { $eq: [{ $month: '$holiday_date' }, month + 1] },
        { $eq: [{ $dayOfMonth: '$holiday_date' }, day] }
      ]
    }
  });

  const recurring = await ClinicHoliday.findOne(recurringQuery);
  if (recurring) {
    if (appointmentType === 'emergency' && recurring.allow_emergency) {
      return false;
    }
    return true;
  }

  return false;
};

module.exports = {
  createHoliday,
  listHolidays,
  updateHoliday,
  softDeleteHoliday,
  permanentDeleteHoliday,
  isClosedOnDate
};
