const mongoose = require('mongoose');

const leaveTypeSchema = new mongoose.Schema({
  code: { type: String, required: true, uppercase: true }, // e.g. SICK_LEAVE
  name: { type: String, required: true }, // e.g. Sick Leave
  monthlyLimit: { type: Number, default: 0 },
  yearlyLimit: { type: Number, default: 0 },
  allowRollover: { type: Boolean, default: false },
  rolloverPercentage: { type: Number, min: 0, max: 100, default: 100 },
  maxAccumulated: { type: Number, default: 99 }
});

const leavePolicySchema = new mongoose.Schema(
  {
    clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true, unique: true },
    leaveTypes: {
      type: [leaveTypeSchema],
      default: [
        { code: 'SICK_LEAVE', name: 'Sick Leave', monthlyLimit: 2, yearlyLimit: 24, allowRollover: true, rolloverPercentage: 100, maxAccumulated: 10 },
        { code: 'CASUAL_LEAVE', name: 'Casual Leave', monthlyLimit: 1, yearlyLimit: 12, allowRollover: true, rolloverPercentage: 100, maxAccumulated: 6 },
        { code: 'EMERGENCY_LEAVE', name: 'Emergency Leave', monthlyLimit: 1, yearlyLimit: 12, allowRollover: false, rolloverPercentage: 0, maxAccumulated: 1 },
        { code: 'VACATION', name: 'Vacation', monthlyLimit: 0, yearlyLimit: 15, allowRollover: false, rolloverPercentage: 0, maxAccumulated: 15 },
        { code: 'CONFERENCE', name: 'Conference', monthlyLimit: 0, yearlyLimit: 5, allowRollover: false, rolloverPercentage: 0, maxAccumulated: 5 },
        { code: 'TRAINING', name: 'Training', monthlyLimit: 0, yearlyLimit: 5, allowRollover: false, rolloverPercentage: 0, maxAccumulated: 5 }
      ]
    },
    paymentDeductionRule: {
      type: String,
      enum: ['mark_unpaid', 'warn_only', 'auto_reject'],
      default: 'mark_unpaid'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.models.LeavePolicy || mongoose.model('LeavePolicy', leavePolicySchema);
