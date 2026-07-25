const { Router } = require('express');
const { protect } = require('../../common/middlewares/auth.middleware');
const chatController = require('./chat.controller');

const router = Router();

router.get('/conversations', protect, chatController.getConversations);
router.post('/conversations', protect, chatController.getOrCreateConversation);
router.get('/conversations/:conversationId/messages', protect, chatController.getMessages);
router.post('/messages', protect, chatController.sendMessage);
router.patch('/conversations/:conversationId/read', protect, chatController.markAsRead);

module.exports = router;
