const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const { createCustomRateLimit } = require('../middleware/rateLimiter');

// Rate limiting
const fileUploadLimiter = createCustomRateLimit(60 * 1000, 5, 'Too many file upload requests'); // 5 uploads per minute

// File upload routes
router.post('/upload', authenticate, fileUploadLimiter, fileController.upload.single('file'), fileController.uploadFile);
router.post('/upload/multiple', authenticate, fileUploadLimiter, fileController.upload.array('files', 5), fileController.uploadMultipleFiles);

// File access routes
router.get('/:id', optionalAuth, fileController.getFileById);
router.get('/:id/download', optionalAuth, fileController.downloadFile);
router.get('/shared/:token', fileController.getSharedFile);

// File management routes
router.get('/user/files', authenticate, fileController.getUserFiles);
router.put('/:id', authenticate, fileController.updateFile);
router.delete('/:id', authenticate, fileController.deleteFile);
router.post('/:id/share', authenticate, fileController.createShareLink);

// Statistics
router.get('/user/stats', authenticate, fileController.getFileStats);

module.exports = router; 