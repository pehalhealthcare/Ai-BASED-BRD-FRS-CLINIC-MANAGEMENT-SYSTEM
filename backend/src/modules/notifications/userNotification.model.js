const mongoose = require('mongoose');

const userNotificationSchema = new mongoose.Schema({
  clinicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Clinic',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['appointment', 'billing', 'alert', 'lab', 'inventory', 'provider', 'system', 'ai_insight'],
    default: 'system'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  actionable: {
    type: Boolean,
    default: false
  },
  actionLabel: {
    type: String,
    default: ''
  },
  actionTask: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('UserNotification', userNotificationSchema);
