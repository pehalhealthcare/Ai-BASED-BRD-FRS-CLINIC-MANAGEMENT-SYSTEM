const ClinicHoliday = require('./clinicHoliday.model');
const Clinic = require('../clinics/clinic.model');
const { AppError } = require('../../common/utils/AppError');
const { HTTP_STATUS } = require('../../common/constants/httpStatus');
const { asyncHandler } = require('../../common/utils/asyncHandler');

/** List holidays for a clinic */
const list = asyncHandler(async (req, res) => {
  const clinicId = req.user.clinicId;
  const includeDeleted = req.query.includeDeleted === 'true';
  
  const filter = {};
  if (clinicId) {
    filter.$or = [
      { clinicId },
      { all_clinics: true }
    ];
  }
  
  if (!includeDeleted) {
    filter.is_deleted = false;
  }
  
  const holidays = await ClinicHoliday.find(filter)
    .populate('clinicId', 'name')
    .sort({ holiday_date: 1 })
    .lean();
  res.json({ holidays });
});

/** Create a new holiday */
const create = asyncHandler(async (req, res) => {
  const { holiday_name, holiday_date, is_recurring, closed_portions, all_clinics, allow_emergency, clinicIds } = req.body;
  
  let targets = [];
  if (all_clinics) {
    const clinics = await Clinic.find({ isActive: true }).select('_id');
    targets = clinics.map(c => c._id);
  } else if (clinicIds && clinicIds.length > 0) {
    targets = clinicIds;
  } else {
    targets = [req.user.clinicId];
  }

  const holidays = [];
  for (const targetClinicId of targets) {
    const holiday = new ClinicHoliday({
      clinicId: targetClinicId,
      holiday_name,
      holiday_date,
      is_recurring: is_recurring || false,
      all_clinics: all_clinics || false,
      allow_emergency: allow_emergency || false,
      closed_portions: closed_portions || ['all'],
      is_deleted: false
    });
    await holiday.save();
    holidays.push(holiday);
  }
  res.status(201).json({ holiday: holidays[0], holidays });
});

/** Update holiday */
const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const holiday = await ClinicHoliday.findOneAndUpdate(
    { _id: id },
    updates,
    { new: true }
  ).populate('clinicId', 'name').lean();
  if (!holiday) throw new AppError('Holiday not found', HTTP_STATUS.NOT_FOUND);
  res.json({ holiday });
});

/** Delete holiday (temporary/soft or permanent) */
const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const permanent = req.query.permanent === 'true';

  let holiday;
  if (permanent) {
    holiday = await ClinicHoliday.findByIdAndDelete(id).lean();
  } else {
    holiday = await ClinicHoliday.findByIdAndUpdate(id, { is_deleted: true }, { new: true }).lean();
  }

  if (!holiday) throw new AppError('Holiday not found', HTTP_STATUS.NOT_FOUND);
  res.json({ success: true, message: permanent ? 'Holiday deleted permanently' : 'Holiday deleted temporarily', holiday });
});

module.exports = { list, create, update, remove };
