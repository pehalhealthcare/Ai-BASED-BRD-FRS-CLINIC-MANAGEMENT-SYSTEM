const mongoose = require('mongoose');

const doctorLeaveBalanceSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true }, // 1-12
    leaveType: { type: String, required: true, uppercase: true },
    allocated: { type: Number, default: 0 },
    used: { type: Number, default: 0 },
    remaining: { type: Number, default: 0 }
  },
  { timestamps: true }
);

doctorLeaveBalanceSchema.index({ doctorId: 1, year: 1, month: 1, leaveType: 1 }, { unique: true });

module.exports = mongoose.models.DoctorLeaveBalance || mongoose.model('DoctorLeaveBalance', doctorLeaveBalanceSchema);
