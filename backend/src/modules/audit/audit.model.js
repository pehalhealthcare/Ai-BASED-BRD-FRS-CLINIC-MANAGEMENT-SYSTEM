const mongoose = require('mongoose');

const auditSchema = new mongoose.Schema(
  {
    actorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
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
