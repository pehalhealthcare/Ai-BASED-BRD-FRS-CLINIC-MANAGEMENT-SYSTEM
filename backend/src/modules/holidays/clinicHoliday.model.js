// Clinic Holiday Model
const mongoose = require('mongoose');

const clinicHolidaySchema = new mongoose.Schema(
  {
    clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
    holiday_name: { type: String, required: true, trim: true },
    holiday_date: { type: Date, required: true },
    is_recurring: { type: Boolean, default: false },
    is_deleted: { type: Boolean, default: false },
    all_clinics: { type: Boolean, default: false }, // If true, holiday applies to all clinics
    allow_emergency: { type: Boolean, default: false }, // If true, emergency bookings are allowed on this day
    closed_portions: { type: [String], default: ['all'] } // 'all', 'appointments', 'doctor_slots', 'labs', 'pharmacy'
  },
  { timestamps: true }
);

// Indexes for quick lookup
clinicHolidaySchema.index({ clinicId: 1, holiday_date: 1, is_deleted: 1 });
clinicHolidaySchema.index({ all_clinics: 1, holiday_date: 1, is_deleted: 1 });

module.exports = mongoose.models.ClinicHoliday || mongoose.model('ClinicHoliday', clinicHolidaySchema);
