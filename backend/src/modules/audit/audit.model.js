const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema(
  {
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      default: null,
      index: true
    },
    action: {
      type: String,
      required: true,
      trim: true
    },
    entity: {
      type: String,
      required: true,
      trim: true
    },
    module: {
      type: String,
      trim: true,
      default: ''
    },
    details: {
      type: String,
      trim: true,
      default: ''
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    metadata: {
      type: Object,
      default: {}
    },
    ipAddress: {
      type: String,
      default: null
    },
    userAgent: {
      type: String,
      default: null
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILURE'],
      default: 'SUCCESS'
    }
  },
  {
    collection: 'audit_logs',
    timestamps: { createdAt: true, updatedAt: false }
  }
);

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditSchema);

module.exports = AuditLog;
