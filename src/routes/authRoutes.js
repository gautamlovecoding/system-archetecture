const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimiter');

// Rate limiting for auth endpoints
const authLimiter = createRateLimiter('auth', 5, 15 * 60 * 1000); // 5 requests per 15 minutes
const loginLimiter = createRateLimiter('login', 3, 15 * 60 * 1000); // 3 requests per 15 minutes

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