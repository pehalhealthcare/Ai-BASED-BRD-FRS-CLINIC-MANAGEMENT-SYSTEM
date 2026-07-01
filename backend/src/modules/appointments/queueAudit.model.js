const mongoose = require('mongoose');

const queueAuditSchema = new mongoose.Schema(
  {
    tokenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Token',
      required: true
    },
    oldPosition: {
      type: Number,
      required: true
    },
    newPosition: {
      type: Number,
      required: true
    },
    reason: {
      type: String,
      required: true,
      trim: true
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    collection: 'queue_audits'
  }
);

const QueueAudit = mongoose.models.QueueAudit || mongoose.model('QueueAudit', queueAuditSchema);

module.exports = QueueAudit;
