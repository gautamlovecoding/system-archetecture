const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimiter');

// Rate limiting
const searchLimiter = createRateLimiter('search', 20, 60 * 1000); // 20 searches per minute

// Search routes
router.get('/', optionalAuth, searchLimiter, searchController.universalSearch);
router.get('/urls', optionalAuth, searchLimiter, searchController.searchUrls);
router.get('/files', optionalAuth, searchLimiter, searchController.searchFiles);
router.get('/suggestions', optionalAuth, searchController.getSearchSuggestions);
router.get('/popular-terms', optionalAuth, searchController.getPopularSearchTerms);

module.exports = router; 