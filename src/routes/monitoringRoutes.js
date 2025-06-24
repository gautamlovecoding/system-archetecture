const express = require('express');
const router = express.Router();
const monitoringController = require('../controllers/monitoringController');
const { authenticate, authorize } = require('../middleware/auth');

// Public health check
router.get('/health', monitoringController.healthCheck);

// Admin-only monitoring routes
router.get('/metrics', authenticate, authorize('admin'), monitoringController.getSystemMetrics);
router.get('/performance', authenticate, authorize('admin'), monitoringController.getPerformanceMetrics);
router.get('/server', authenticate, authorize('admin'), monitoringController.getServerStats);
router.get('/logs', authenticate, authorize('admin'), monitoringController.getLogs);
router.get('/config', authenticate, authorize('admin'), monitoringController.getConfig);
router.get('/alerts', authenticate, authorize('admin'), monitoringController.getAlerts);
router.post('/cache/clear', authenticate, authorize('admin'), monitoringController.clearCache);

module.exports = router; 