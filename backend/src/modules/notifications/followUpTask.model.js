const mongoose = require('mongoose');

const followUpTaskSchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true
    },
    consultationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
      default: null
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      default: null
    },
    title: {
      type: String,
      trim: true,
      required: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    dueDate: {
      type: Date,
      required: true
    },
    type: {
      type: String,
      enum: ['follow_up_visit', 'lab_review', 'medication_review', 'custom'],
      default: 'follow_up_visit'
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled'],
      default: 'pending'
    },
    reminderSent: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    collection: 'follow_up_tasks',
    timestamps: true
  }
);

followUpTaskSchema.index({ clinicId: 1, patientId: 1, dueDate: -1 });
followUpTaskSchema.index({ clinicId: 1, doctorId: 1, dueDate: -1 });
followUpTaskSchema.index({ clinicId: 1, status: 1, dueDate: 1 });

const FollowUpTask =
  mongoose.models.FollowUpTask || mongoose.model('FollowUpTask', followUpTaskSchema);

module.exports = FollowUpTask;
