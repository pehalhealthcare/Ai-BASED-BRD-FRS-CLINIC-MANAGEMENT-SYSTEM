const mongoose = require('mongoose');

const checkinSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true
    },
    checkinTime: {
      type: Date,
      default: Date.now
    },
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    method: {
      type: String,
      enum: ['QR', 'Reception'],
      default: 'Reception'
    }
  },
  {
    timestamps: true,
    collection: 'checkins'
  }
);

const CheckIn = mongoose.models.CheckIn || mongoose.model('CheckIn', checkinSchema);

module.exports = CheckIn;
