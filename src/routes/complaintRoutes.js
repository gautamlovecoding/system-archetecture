const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const { authenticate, authorize } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimiter');

// Rate limiting
const complaintLimiter = createRateLimiter('complaint', 5, 60 * 1000); // 5 complaints per minute

// Complaint management
router.post('/', authenticate, complaintLimiter, complaintController.createComplaint);
router.get('/user', authenticate, complaintController.getUserComplaints);
router.get('/stats', authenticate, complaintController.getComplaintStats);
router.get('/:id', authenticate, complaintController.getComplaintById);
router.post('/:id/message', authenticate, complaintController.addMessage);
router.put('/:id/rate', authenticate, complaintController.rateComplaint);

// Admin/Moderator routes
router.get('/', authenticate, authorize('admin', 'moderator'), complaintController.getAllComplaints);
router.put('/:id/status', authenticate, authorize('admin', 'moderator'), complaintController.updateComplaintStatus);

module.exports = router; 