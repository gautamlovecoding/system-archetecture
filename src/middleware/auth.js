const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { createError } = require('./errorHandler');
const { logger } = require('../utils/logger');

// Middleware to authenticate user
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return next(createError.unauthorized('Access token is required'));
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');
    
    if (!user) {
      return next(createError.unauthorized('User not found'));
    }
    
    if (!user.isActive) {
      return next(createError.unauthorized('Account is deactivated'));
    }
    
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(createError.unauthorized('Invalid token'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(createError.unauthorized('Token expired'));
    }
    
    logger.error('Authentication error:', error);
    next(createError.unauthorized('Authentication failed'));
  }
};

// Middleware for optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return next();
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (user && user.isActive) {
      req.user = user;
    }
    
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

// Middleware to authorize based on roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError.unauthorized('Authentication required'));
    }
    
    if (!roles.includes(req.user.role)) {
      return next(createError.forbidden('Insufficient permissions'));
    }
    
    next();
  };
};

// Middleware to check if user owns the resource
const checkOwnership = (resourceField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError.unauthorized('Authentication required'));
    }
    
    // Admin can access all resources
    if (req.user.role === 'admin') {
      return next();
    }
    
    const resourceId = req.params.id || req.params.userId || req.body[resourceField];
    
    if (resourceId && resourceId.toString() !== req.user._id.toString()) {
      return next(createError.forbidden('Access denied'));
    }
    
    next();
  };
};

// Middleware to check subscription tier
const checkSubscription = (...allowedTiers) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError.unauthorized('Authentication required'));
    }
    
    if (!allowedTiers.includes(req.user.subscription)) {
      return next(createError.forbidden('Subscription upgrade required'));
    }
    
    next();
  };
};

// Generate JWT tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { 
      id: user._id, 
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
  
  const refreshToken = jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  
  return { accessToken, refreshToken };
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize,
  checkOwnership,
  checkSubscription,
  generateTokens,
  verifyRefreshToken
}; 