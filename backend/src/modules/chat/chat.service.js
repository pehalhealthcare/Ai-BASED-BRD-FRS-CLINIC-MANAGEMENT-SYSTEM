const Conversation = require('./conversation.model');
const Message = require('./message.model');
const User = require('../users/user.model');

class ChatService {
  /**
   * List conversations for receptionist or doctor
   */
  async getConversations(clinicId, userId, userRole) {
    const query = { clinicId };
    if (userRole === 'RECEPTIONIST') {
      query.receptionistId = userId;
    } else if (userRole === 'DOCTOR') {
      query.doctorId = userId;
    }

    const conversations = await Conversation.find(query)
      .sort({ lastMessageAt: -1 })
      .populate('doctorId', 'fullName email phone specialization qualification gender doctorCode approvalStatus')
      .populate('receptionistId', 'fullName email phone staffCode approvalStatus');

    return conversations;
  }

  /**
   * Get or create a conversation between a receptionist and doctor
   */
  async getOrCreateConversation(clinicId, doctorId, receptionistId) {
    let conversation = await Conversation.findOne({
      clinicId,
      doctorId,
      receptionistId
    });

    if (!conversation) {
      conversation = await Conversation.create({
        clinicId,
        doctorId,
        receptionistId,
        unreadCount: { doctor: 0, receptionist: 0 }
      });
    }

    return conversation;
  }

  /**
   * Get messages inside a conversation
   */
  async getMessages(conversationId) {
    return await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .limit(100);
  }

  /**
   * Save a message and update last message info in conversation
   */
  async saveMessage({ conversationId, senderId, senderRole, receiverId, message, messageType, attachmentUrl }) {
    const msg = await Message.create({
      conversationId,
      senderId,
      senderRole,
      receiverId,
      message,
      messageType: messageType || 'text',
      attachmentUrl: attachmentUrl || '',
      isRead: false
    });

    // Update conversation
    const conversation = await Conversation.findById(conversationId);
    if (conversation) {
      conversation.lastMessage = messageType === 'text' ? message : `[${messageType}]`;
      conversation.lastMessageAt = new Date();
      
      // Increment unread count for receiver
      if (senderRole === 'RECEPTIONIST') {
        conversation.unreadCount.doctor = (conversation.unreadCount.doctor || 0) + 1;
      } else {
        conversation.unreadCount.receptionist = (conversation.unreadCount.receptionist || 0) + 1;
      }
      
      await conversation.save();
    }

    return msg;
  }

  /**
   * Mark all messages in a conversation as read for the current role
   */
  async markAsRead(conversationId, userRole) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return null;

    if (userRole === 'RECEPTIONIST') {
      conversation.unreadCount.receptionist = 0;
    } else if (userRole === 'DOCTOR') {
      conversation.unreadCount.doctor = 0;
    }

    await conversation.save();

    // Update message read status
    await Message.updateMany(
      { conversationId, senderRole: userRole === 'RECEPTIONIST' ? 'DOCTOR' : 'RECEPTIONIST', isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    return conversation;
  }
}

module.exports = new ChatService();
