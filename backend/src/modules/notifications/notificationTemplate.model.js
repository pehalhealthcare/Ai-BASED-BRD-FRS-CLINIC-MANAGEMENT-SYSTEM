const mongoose = require('mongoose');

const notificationTemplateSchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true,
      index: true
    },
    name: {
      type: String,
      trim: true,
      required: true
    },
    type: {
      type: String,
      enum: ['appointment_reminder', 'follow_up', 'prescription_ready', 'billing_due', 'lab_report_ready', 'appointment_booked', 'appointment_cancelled', 'appointment_rescheduled', 'consultation_completed', 'final_bill', 'custom'],
      required: true
    },
    channel: {
      type: String,
      enum: ['sms', 'whatsapp', 'email', 'in_app', 'mock'],
      required: true
    },
    subject: {
      type: String,
      trim: true,
      default: ''
    },
    body: {
      type: String,
      trim: true,
      required: true
    },
    variables: {
      type: [String],
      default: []
    },
    isActive: {
      type: Boolean,
      default: true
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
    collection: 'notification_templates',
    timestamps: true
  }
);

notificationTemplateSchema.index({ clinicId: 1, name: 1 });
notificationTemplateSchema.index({ clinicId: 1, type: 1, channel: 1, isActive: 1 });

const NotificationTemplate =
  mongoose.models.NotificationTemplate || mongoose.model('NotificationTemplate', notificationTemplateSchema);

module.exports = NotificationTemplate;
