const express = require('express');
const router = express.Router();
const bulkController = require('../controllers/bulkController');
const { authenticate, authorize } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimiter');

// Rate limiting
const bulkLimiter = createRateLimiter('bulk', 2, 60 * 1000); // 2 bulk operations per minute

// Bulk operations
router.post('/import', authenticate, bulkLimiter, bulkController.upload.single('file'), bulkController.startBulkImport);
router.get('/operations', authenticate, bulkController.getUserBulkOperations);
router.get('/operation/:id', authenticate, bulkController.getBulkOperationStatus);
router.get('/operation/:id/results', authenticate, bulkController.getBulkOperationResults);
router.post('/operation/:id/cancel', authenticate, bulkController.cancelBulkOperation);

// Templates
router.get('/template/:operation', authenticate, bulkController.getCSVTemplate);

module.exports = router; 