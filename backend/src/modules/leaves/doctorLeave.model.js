const mongoose = require('mongoose');

const doctorLeaveSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    clinicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Clinic', required: true },
    start_datetime: { type: Date, required: true },
    end_datetime: { type: Date, required: true },
    leave_type: {
      type: String,
      required: true
    },
    reason: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending'
    },
    approved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isUnpaid: { type: Boolean, default: false },
    exceedsLimit: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Indexes for date range overlap search
doctorLeaveSchema.index({ doctorId: 1, start_datetime: 1, end_datetime: 1, status: 1 });
doctorLeaveSchema.index({ clinicId: 1, status: 1 });

const DoctorLeave = mongoose.models.DoctorLeave || mongoose.model('DoctorLeave', doctorLeaveSchema);

module.exports = DoctorLeave;
