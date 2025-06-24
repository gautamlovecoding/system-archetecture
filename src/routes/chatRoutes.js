const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');
const { createCustomRateLimit } = require('../middleware/rateLimiter');

// Rate limiting
const messageLimiter = createCustomRateLimit(60 * 1000, 30, 'Too many messages sent'); // 30 messages per minute

// Message routes
router.post('/send', authenticate, messageLimiter, chatController.sendMessage);
router.get('/conversations', authenticate, chatController.getConversations);
router.get('/history/:userId', authenticate, chatController.getChatHistory);
router.get('/unread-count', authenticate, chatController.getUnreadCount);
router.get('/search', authenticate, chatController.searchMessages);

// Message management
router.put('/message/:messageId/read', authenticate, chatController.markAsRead);
router.put('/conversation/:userId/read', authenticate, chatController.markConversationAsRead);
router.put('/message/:messageId', authenticate, chatController.editMessage);
router.delete('/message/:messageId', authenticate, chatController.deleteMessage);

module.exports = router; 