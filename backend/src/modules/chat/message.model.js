const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true
    },
    senderRole: {
      type: String,
      enum: ['DOCTOR', 'RECEPTIONIST'],
      required: true
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'voice', 'system'],
      default: 'text'
    },
    message: {
      type: String,
      required: true
    },
    attachmentUrl: {
      type: String,
      default: ''
    },
    isRead: {
      type: Boolean,
      default: false
    },
    deliveredAt: {
      type: Date
    },
    readAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

messageSchema.index({ conversationId: 1 });
messageSchema.index({ createdAt: 1 });

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema, 'messages');
module.exports = Message;
