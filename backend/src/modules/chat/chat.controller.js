const chatService = require('./chat.service');
const { sendSuccess, sendError } = require('../../common/utils/apiResponse');

class ChatController {
  async getConversations(req, res) {
    try {
      const { _id: userId, role, clinicId } = req.user;
      const conversations = await chatService.getConversations(clinicId, userId, role);
      return sendSuccess(res, 'Conversations retrieved successfully', { conversations });
    } catch (error) {
      return sendError(res, error.message || 'Error fetching conversations');
    }
  }

  async getOrCreateConversation(req, res) {
    try {
      const { _id: userId, role, clinicId } = req.user;
      const { doctorId, receptionistId } = req.body;

      // Determine sender / receiver
      const docId = role === 'DOCTOR' ? userId : doctorId;
      const recepId = role === 'RECEPTIONIST' ? userId : receptionistId;

      if (!docId || !recepId) {
        return sendError(res, 'Both doctorId and receptionistId are required', 400);
      }

      const conversation = await chatService.getOrCreateConversation(clinicId, docId, recepId);
      return sendSuccess(res, 'Conversation initialized', { conversation });
    } catch (error) {
      return sendError(res, error.message || 'Error starting conversation');
    }
  }

  async getMessages(req, res) {
    try {
      const { conversationId } = req.params;
      const messages = await chatService.getMessages(conversationId);
      return sendSuccess(res, 'Messages retrieved successfully', { messages });
    } catch (error) {
      return sendError(res, error.message || 'Error fetching messages');
    }
  }

  async sendMessage(req, res) {
    try {
      const { _id: senderId, role: senderRole } = req.user;
      const { conversationId, receiverId, message, messageType, attachmentUrl } = req.body;

      if (!conversationId || !receiverId || !message) {
        return sendError(res, 'conversationId, receiverId and message are required', 400);
      }

      const msg = await chatService.saveMessage({
        conversationId,
        senderId,
        senderRole,
        receiverId,
        message,
        messageType,
        attachmentUrl
      });

      // If WebSocket broadcast is needed, it can also be handled at socket server level.
      // But we will also send the message back in the HTTP response.
      return sendSuccess(res, 'Message sent successfully', { message: msg });
    } catch (error) {
      return sendError(res, error.message || 'Error sending message');
    }
  }

  async markAsRead(req, res) {
    try {
      const { role } = req.user;
      const { conversationId } = req.params;
      const conversation = await chatService.markAsRead(conversationId, role);
      return sendSuccess(res, 'Conversation marked as read', { conversation });
    } catch (error) {
      return sendError(res, error.message || 'Error marking conversation as read');
    }
  }
}

module.exports = new ChatController();
