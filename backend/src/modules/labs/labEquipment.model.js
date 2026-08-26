const mongoose = require('mongoose');

const labEquipmentSchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    laboratoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider',
      default: null,
      index: true
    },
    model: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['Running', 'Idle', 'Maintenance', 'Offline', 'Calibration Due', 'Error'],
      default: 'Idle'
    },
    workload: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    lastMaintenance: {
      type: Date,
      default: null
    },
    nextMaintenance: {
      type: Date,
      default: null
    },
    calibrationStatus: {
      type: String,
      enum: ['Pass', 'Failed', 'Due'],
      default: 'Pass'
    },
    lastCalibration: {
      type: Date,
      default: null
    },
    nextCalibration: {
      type: Date,
      default: null
    }
  },
  {
    collection: 'lab_equipment',
    timestamps: true
  }
);

const LabEquipment = mongoose.models.LabEquipment || mongoose.model('LabEquipment', labEquipmentSchema);
module.exports = LabEquipment;
