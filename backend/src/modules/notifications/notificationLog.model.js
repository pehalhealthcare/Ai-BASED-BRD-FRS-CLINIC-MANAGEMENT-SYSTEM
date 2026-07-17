const mongoose = require('mongoose');

const recipientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: ''
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    email: {
      type: String,
      trim: true,
      default: ''
    }
  },
  { _id: false }
);

const notificationLogSchema = new mongoose.Schema(
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
      default: null
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null
    },
    consultationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Consultation',
      default: null
    },
    prescriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prescription',
      default: null
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      default: null
    },
    labOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LabOrder',
      default: null
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NotificationTemplate',
      default: null
    },
    type: {
      type: String,
      enum: ['appointment_reminder', 'follow_up', 'prescription_ready', 'billing_due', 'lab_report_ready', 'appointment_booked', 'appointment_cancelled', 'appointment_rescheduled', 'consultation_completed', 'final_bill', 'custom', 'feature_request'],
      required: true
    },
    channel: {
      type: String,
      enum: ['sms', 'whatsapp', 'email', 'in_app', 'mock'],
      required: true
    },
    recipient: {
      type: recipientSchema,
      default: () => ({})
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
    renderedVariables: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'cancelled'],
      default: 'pending'
    },
    provider: {
      type: String,
      trim: true,
      default: 'mock'
    },
    providerMessageId: {
      type: String,
      trim: true,
      default: ''
    },
    scheduledFor: {
      type: Date,
      default: null
    },
    sentAt: {
      type: Date,
      default: null
    },
    failureReason: {
      type: String,
      trim: true,
      default: ''
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
    collection: 'notification_logs',
    timestamps: true
  }
);

notificationLogSchema.index({ clinicId: 1, patientId: 1, createdAt: -1 });
notificationLogSchema.index({ clinicId: 1, type: 1, status: 1, createdAt: -1 });
notificationLogSchema.index({ clinicId: 1, status: 1, scheduledFor: 1 });
notificationLogSchema.index({ clinicId: 1, appointmentId: 1, type: 1, createdAt: -1 });

const NotificationLog =
  mongoose.models.NotificationLog || mongoose.model('NotificationLog', notificationLogSchema);

module.exports = NotificationLog;
