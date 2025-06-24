const express = require('express');
const router = express.Router();
const urlController = require('../controllers/urlController');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { createCustomRateLimit } = require('../middleware/rateLimiter');

// Rate limiting
const urlCreateLimiter = createCustomRateLimit(60 * 1000, 10, 'Too many URL creation requests'); // 10 URLs per minute
const urlAccessLimiter = createCustomRateLimit(60 * 1000, 100, 'Too many URL access requests'); // 100 accesses per minute

// Public routes
router.get('/:code', urlAccessLimiter, urlController.redirectToOriginal);
router.get('/popular', optionalAuth, urlController.getPopularUrls);

// Protected routes
router.post('/', authenticate, urlCreateLimiter, urlController.createShortUrl);
router.get('/analytics/:code', authenticate, urlController.getUrlAnalytics);
router.get('/user/urls', authenticate, urlController.getUserUrls);
router.put('/:id', authenticate, urlController.updateUrl);
router.delete('/:id', authenticate, urlController.deleteUrl);

// Admin routes
router.get('/admin/stats', authenticate, authorize('admin'), urlController.getUrlStats);

module.exports = router; 