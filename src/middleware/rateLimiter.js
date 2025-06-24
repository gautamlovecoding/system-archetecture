const rateLimit = require('express-rate-limit');
const { rateLimitOperations } = require('../config/redis');
const { logger } = require('../utils/logger');
const { AppError } = require('./errorHandler');

// Redis-based rate limiter store
const redisStore = {
  // Increment the rate limit counter
  incr: async (key, windowMs) => {
    try {
      const current = await rateLimitOperations.incrementRateLimit(key, windowMs);
      return {
        totalHits: current,
        resetTime: new Date(Date.now() + windowMs)
      };
    } catch (error) {
      logger.error('Redis rate limit incr error:', error);
      throw error;
    }
  },

  // Decrement the rate limit counter (not typically used)
  decrement: async (key) => {
    // Redis handles TTL automatically, so this is typically not needed
    return;
  },

  // Reset the rate limit counter
  resetKey: async (key) => {
    try {
      await rateLimitOperations.del(key);
      return;
    } catch (error) {
      logger.error('Redis rate limit reset error:', error);
      throw error;
    }
  }
};

// Custom rate limiter using Redis
const createRedisRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // limit each IP to 100 requests per windowMs
    message = 'Too many requests from this IP, please try again later.',
    standardHeaders = true, // return rate limit info in the `RateLimit-*` headers
    legacyHeaders = false, // disable the `X-RateLimit-*` headers
    keyGenerator = (req) => req.ip, // function to generate custom keys
    skip = () => false, // function to skip certain requests
    onLimitReached = null // callback when limit is reached
  } = options;

  return async (req, res, next) => {
    try {
      // Check if this request should be skipped
      if (skip(req)) {
        return next();
      }

      const key = `rate_limit:${keyGenerator(req)}`;
      
      // Get current count
      const current = await rateLimitOperations.getRateLimit(key);
      
      if (current >= max) {
        // Rate limit exceeded
        logger.security('Rate Limit Exceeded', {
          ip: req.ip,
          url: req.originalUrl,
          method: req.method,
          current,
          max,
          windowMs
        }, 'medium');

        if (onLimitReached) {
          onLimitReached(req, res);
        }

        // Set headers
        if (standardHeaders) {
          res.set({
            'RateLimit-Limit': max,
            'RateLimit-Remaining': 0,
            'RateLimit-Reset': new Date(Date.now() + windowMs)
          });
        }

        return res.status(429).json({
          success: false,
          message,
          statusCode: 429,
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }

      // Increment counter
      const newCount = await rateLimitOperations.incrementRateLimit(key, windowMs);
      
      // Set headers
      if (standardHeaders) {
        res.set({
          'RateLimit-Limit': max,
          'RateLimit-Remaining': Math.max(0, max - newCount),
          'RateLimit-Reset': new Date(Date.now() + windowMs)
        });
      }

      next();
    } catch (error) {
      logger.error('Rate limiter error:', error);
      // In case of Redis failure, allow the request to proceed
      next();
    }
  };
};

// Global rate limiter for all requests
const globalRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    statusCode: 429
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.security('Global Rate Limit Exceeded', {
      ip: req.ip,
      url: req.originalUrl,
      method: req.method,
      userAgent: req.get('User-Agent')
    }, 'medium');

    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      statusCode: 429,
      retryAfter: Math.ceil(15 * 60) // 15 minutes in seconds
    });
  }
});

// Strict rate limiter for authentication endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs for auth routes
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    statusCode: 429
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.security('Auth Rate Limit Exceeded', {
      ip: req.ip,
      url: req.originalUrl,
      method: req.method,
      userAgent: req.get('User-Agent')
    }, 'high');

    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again later.',
      statusCode: 429,
      retryAfter: Math.ceil(15 * 60)
    });
  }
});

// API rate limiter for general API routes
const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs for API routes
  message: {
    success: false,
    message: 'Too many API requests, please try again later.',
    statusCode: 429
  },
  standardHeaders: true,
  legacyHeaders: false
});

// File upload rate limiter
const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // limit each IP to 50 file uploads per hour
  message: {
    success: false,
    message: 'Too many file uploads, please try again later.',
    statusCode: 429
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Search rate limiter
const searchRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 100, // limit each IP to 100 search requests per 5 minutes
  message: {
    success: false,
    message: 'Too many search requests, please try again later.',
    statusCode: 429
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Bulk operation rate limiter
const bulkRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 bulk operations per hour
  message: {
    success: false,
    message: 'Too many bulk operations, please try again later.',
    statusCode: 429
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Create custom rate limiter for specific endpoints
const createCustomRateLimit = (windowMs, max, message = 'Rate limit exceeded') => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
      statusCode: 429
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.security('Custom Rate Limit Exceeded', {
        ip: req.ip,
        url: req.originalUrl,
        method: req.method,
        windowMs,
        max
      }, 'medium');

      res.status(429).json({
        success: false,
        message,
        statusCode: 429,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Per-user rate limiter (requires authentication)
const createUserRateLimit = (windowMs, max, message = 'User rate limit exceeded') => {
  return rateLimit({
    windowMs,
    max,
    keyGenerator: (req) => req.user ? req.user.id : req.ip,
    message: {
      success: false,
      message,
      statusCode: 429
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// Sliding window rate limiter
const createSlidingWindowRateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = 'Rate limit exceeded'
  } = options;

  return async (req, res, next) => {
    try {
      const key = `sliding_window:${req.ip}`;
      const now = Date.now();
      const windowStart = now - windowMs;

      // This would require a more sophisticated Redis implementation
      // For now, we'll use the standard rate limiter
      return createCustomRateLimit(windowMs, max, message)(req, res, next);
    } catch (error) {
      logger.error('Sliding window rate limiter error:', error);
      next();
    }
  };
};

// Dynamic rate limiter based on user tier
const createTieredRateLimit = (getUserTier) => {
  const tierLimits = {
    free: { windowMs: 15 * 60 * 1000, max: 50 },
    premium: { windowMs: 15 * 60 * 1000, max: 500 },
    enterprise: { windowMs: 15 * 60 * 1000, max: 2000 }
  };

  return async (req, res, next) => {
    try {
      const userTier = getUserTier(req);
      const limits = tierLimits[userTier] || tierLimits.free;
      
      return createCustomRateLimit(
        limits.windowMs, 
        limits.max, 
        `Rate limit exceeded for ${userTier} tier`
      )(req, res, next);
    } catch (error) {
      logger.error('Tiered rate limiter error:', error);
      next();
    }
  };
};

// Rate limit status checker
const getRateLimitStatus = async (req, res, next) => {
  try {
    const key = `rate_limit:${req.ip}`;
    const current = await rateLimitOperations.getRateLimit(key);
    
    req.rateLimitStatus = {
      current,
      remaining: Math.max(0, 100 - current), // Assuming default limit of 100
      resetTime: new Date(Date.now() + (15 * 60 * 1000)) // 15 minutes from now
    };
    
    next();
  } catch (error) {
    logger.error('Rate limit status check error:', error);
    next();
  }
};

module.exports = {
  globalRateLimit,
  authRateLimit,
  apiRateLimit,
  uploadRateLimit,
  searchRateLimit,
  bulkRateLimit,
  createCustomRateLimit,
  createUserRateLimit,
  createSlidingWindowRateLimit,
  createTieredRateLimit,
  createRedisRateLimiter,
  getRateLimitStatus
}; 