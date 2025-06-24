const express = require('express');
const router = express.Router();
const urlController = require('../controllers/urlController');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimiter');

// Rate limiting
const urlCreateLimiter = createRateLimiter('url-create', 10, 60 * 1000); // 10 URLs per minute
const urlAccessLimiter = createRateLimiter('url-access', 100, 60 * 1000); // 100 accesses per minute

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