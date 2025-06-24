const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');
const { createCustomRateLimit } = require('../middleware/rateLimiter');

// Rate limiting for auth endpoints
const authLimiter = createCustomRateLimit(15 * 60 * 1000, 5, 'Too many auth requests, try again later'); // 5 requests per 15 minutes
const loginLimiter = createCustomRateLimit(15 * 60 * 1000, 3, 'Too many login attempts, try again later'); // 3 requests per 15 minutes

// Public routes
router.post('/register', authLimiter, authController.register);
router.post('/login', loginLimiter, authController.login);
router.post('/refresh-token', authLimiter, authController.refreshToken);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.get('/profile', authenticate, authController.getProfile);
router.put('/profile', authenticate, authController.updateProfile);
router.put('/change-password', authenticate, authController.changePassword);
router.delete('/account', authenticate, authController.deleteAccount);

// Admin routes
router.get('/users', authenticate, authorize('admin'), authController.getAllUsers);

module.exports = router; 