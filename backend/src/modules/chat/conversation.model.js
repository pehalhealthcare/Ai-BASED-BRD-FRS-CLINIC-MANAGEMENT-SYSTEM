const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    clinicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Clinic',
      required: true
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    receptionistId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    lastMessage: {
      type: String,
      default: ''
    },
    lastMessageAt: {
      type: Date,
      default: Date.now
    },
    unreadCount: {
      doctor: { type: Number, default: 0 },
      receptionist: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true
  }
);

conversationSchema.index({ clinicId: 1 });
conversationSchema.index({ doctorId: 1, receptionistId: 1 }, { unique: true });

const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', conversationSchema, 'conversations');
module.exports = Conversation;
