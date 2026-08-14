const mongoose = require('mongoose');

const labQcCalibrationSchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true
    },
    equipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LabEquipment',
      required: true
    },
    type: {
      type: String,
      enum: ['QC', 'Calibration'],
      required: true
    },
    parameter: {
      type: String,
      required: true
    },
    value: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['Pass', 'Failed', 'Pending'],
      default: 'Pass'
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    collection: 'lab_qc_calibrations',
    timestamps: true
  }
);

const LabQcCalibration = mongoose.models.LabQcCalibration || mongoose.model('LabQcCalibration', labQcCalibrationSchema);
module.exports = LabQcCalibration;
