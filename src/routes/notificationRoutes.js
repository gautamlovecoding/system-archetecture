const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate, authorize } = require('../middleware/auth');
const { createCustomRateLimit } = require('../middleware/rateLimiter');

// Rate limiting
const notificationLimiter = createCustomRateLimit(60 * 1000, 10, 'Too many notification requests'); // 10 notifications per minute

// Send notifications
router.post('/send', authenticate, notificationLimiter, notificationController.sendNotification);
router.post('/bulk', authenticate, authorize('admin', 'moderator'), notificationController.sendBulkNotifications);

// Get notifications
router.get('/', authenticate, notificationController.getUserNotifications);
router.get('/:id', authenticate, notificationController.getNotificationById);
router.get('/stats', authenticate, notificationController.getNotificationStats);

// Webhook endpoint for delivery status
router.post('/:id/delivered', notificationController.markAsDelivered);

module.exports = router; 